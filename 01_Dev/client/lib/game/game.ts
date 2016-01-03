declare var MongoCollections:any;
declare var GLBoost:any;

interface Window {
  MainScene: any;
  height: any;
  createEvent:any;
  fireEvent:any;
}

interface Document {
  width: number;
  height: number;
}

interface Event {
  initUIEvent: any;
}

module WrtGame {
  eval('WrtGame = _.isUndefined(window.WrtGame) ? WrtGame : window.WrtGame;'); // 内部モジュールを複数ファイルで共有するためのハック
  export class Game {
    private static _instance:Game;
    public static SCREEN_WIDTH = 1200;
    public static SCREEN_HEIGHT = 800;
    public static getInstance():Game
    {
      if(Game._instance == null) {
        Game._instance = new Game();
      }
      return Game._instance;
    }

    public init(data:any, onlyNovel = false, callbackWhenOnlyNovel:Function = null) {
      var novelPlayer = WrtGame.NovelPlayer.getInstance();
      novelPlayer.init();

      if (!onlyNovel) {
        var mapMovement = this.initEvents();
      }

      if (onlyNovel) {
        this.initTmlib(callbackWhenOnlyNovel);
      } else {
        this.initTmlib(()=>{

          //this.initBabylon(data, mapMovement);
          this.initGLBoost(data, mapMovement);
          this.initUserFunctions();

          var e = document.createEvent('UIEvents');
          // type, canBubble, cancelable, view, detail
          e.initUIEvent('resize', true, true, window, 0);
          window.dispatchEvent(e);
        });
      }
    }

    private initEvents() {
      // 物理イベントのプロパティ初期化
      var physicalMapMovementEventProperty:any = WrtGame.initMapMovementEventHandler();
      var physicalUiEventProperty:any = WrtGame.initUiEventHandler();

      var gameState = WrtGame.GameState.getInstance();
      // 論理移動コマンドプロパティ初期化
      var logicalMovementCommandProperty:any = gameState.mapPhysicalEventPropertyToLogicalMovementCommandProperty(physicalMapMovementEventProperty);
      // 論理UIコマンドプロパティ初期化
      var logicalUiCommandProperty:any = gameState.mapPhysicalEventPropertyToLogicalUiCommandProperty(physicalUiEventProperty);

      // マップ移動クラスの初期化
      var mapMovement = WrtGame.MapMovement.getInstance();
      mapMovement.init(logicalMovementCommandProperty);

      var uiOperation = WrtGame.UiOperation.getInstance();
      uiOperation.init(logicalUiCommandProperty);

      return mapMovement;
    }

    private initBabylon(data:any, mapMovement:WrtGame.MapMovement) {
      // canvasの取得と、それを引数にしたBabylonエンジン作成
      var canvas:HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("renderCanvas");
      var engine = new BABYLON.Engine(canvas, true);

      var camera:BABYLON.FreeCamera;
      // Babylonのシーン作成関数
      var createScene = function() {
        var scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color3(0,0,0.2);

        camera = new BABYLON.FreeCamera("Camera", new BABYLON.Vector3(0.5, 0.5, 0.5), scene);
//        camera.attachControl(canvas, false);

        var light = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(1,1,1), scene);
        light.groundColor = new BABYLON.Color3(0.3, 0.3, 0.3);

        return scene;
      };

      // Babylonのシーンの作成と、そのシーンを引数に、flatMapクラスの生成
      var scene = createScene();
      var light = new BABYLON.PointLight("Omni", new BABYLON.Vector3(0.5, 0.5, 0.5), scene);
      light.diffuse = new BABYLON.Color3(0.7, 0.7, 0.7);
      light.specular = new BABYLON.Color3(0.3, 0.3, 0.3);
      light.range = 6;
      scene.registerBeforeRender(function () {
        light.position = camera.position;
      });
//      var map = new WrtGame.FlatMap(scene, data.map, data.mapTextures.fetch());
      var map = new WrtGame.PolygonMap(scene, data.map, data.mapTextures);

      var aspect = canvas.width / canvas.height;

      // Windowのリサイズ対応
      window.addEventListener("resize", function(e) {
        var windowAspect = $(e.target).width() / $(e.target).height();

        if (windowAspect > aspect) {
          $(canvas).css('width', $(e.target).height() * aspect);
          $(canvas).css('height', $(e.target).height());
        } else {
          $(canvas).css('width', $(e.target).width());
          $(canvas).css('height', $(e.target).width() * 1/aspect);
        }
        engine.resize();

      });

      // 描画ループ定義
      engine.runRenderLoop(()=> {
        this.runRenderLoop(mapMovement, map, scene, camera);
      });

    }

    private initGLBoost(data:any, mapMovement:WrtGame.MapMovement) {
      var canvasId = '#renderCanvas';
      var canvas:HTMLCanvasElement = <HTMLCanvasElement>document.querySelector(canvasId);

      var renderer:any = new GLBoost.Renderer({ canvas: canvas, clearColor: {red:0.5, green:0.5, blue:0.5, alpha:1}});

      var scene = new GLBoost.Scene();

      var aspect = canvas.width / canvas.height;
      var camera = new GLBoost.Camera(
        {
          eye: new GLBoost.Vector3(0, 0, 0),
          center: new GLBoost.Vector3(0.0, 0.0, 1.0),
          up: new GLBoost.Vector3(0.0, 1.0, 0.0)
        },
        {
          fovy: 50.0,
          aspect: aspect,
          zNear: 0.1,
          zFar: 300.0
        }
      );
      scene.add( camera );

      var directionalLight_1 = new GLBoost.DirectionalLight(new GLBoost.Vector3(1, 1, 1), new GLBoost.Vector3(-1, -1, 0), canvasId);
      var directionalLight_2 = new GLBoost.DirectionalLight(new GLBoost.Vector3(1, 1, 1), new GLBoost.Vector3(1, 1, 0), canvasId);
      var directionalLight_3 = new GLBoost.DirectionalLight(new GLBoost.Vector3(1, 1, 1), new GLBoost.Vector3(0, 1, 1), canvasId);
      var directionalLight_4 = new GLBoost.DirectionalLight(new GLBoost.Vector3(0.5, 0.5, 0.5), new GLBoost.Vector3(0, 0, -1), canvasId);
      scene.add( directionalLight_1 );
      scene.add( directionalLight_2 );
      scene.add( directionalLight_3 );
      scene.add( directionalLight_4 );

      var map = new WrtGame.PolygonMapGLBoost(scene, data.map, data.mapTextures, canvasId);

      // Windowのリサイズ対応
      window.addEventListener("resize", function(e) {
        var windowAspect = $(e.target).width() / $(e.target).height();

        if (windowAspect > aspect) {
          let width = $(e.target).height() * aspect;
          let height = $(e.target).height();
          $(canvas).css('width', width);
          $(canvas).css('height', height);
          renderer.resize(width, height);
        } else {
          let width = $(e.target).width();
          let height = $(e.target).width() * 1/aspect;
          $(canvas).css('width', width) ;
          $(canvas).css('height',height);
          renderer.resize(width, height);
        }
      });

      this._runRenderLoop(mapMovement, map, renderer, scene, camera);
    }

    private _runRenderLoop(mapMovement:any, map:any, renderer:any, scene:any, camera:any) {

      // 平行移動する
      var moveDelta = 1.0/60*3;
      mapMovement.move(map, moveDelta);

      // 水平方向の向きを変える
      mapMovement.rotate(60*0.8);

      // 垂直方向の向きを変える
      mapMovement.faceUpOrLow(1/60*0.5);

      map.movePlatforms();

      // カメラの位置・回転をセット
      var cameraPos = this.convertGLBoostPlayerPosition(mapMovement.playerX, mapMovement.playerH, mapMovement.playerY, mapMovement.playerAngle, mapMovement.playerElevationAngle);
      camera.eye = cameraPos.viewPos;
      camera.center = cameraPos.centerPos;

      renderer.clearCanvas();
      renderer.draw(scene);

      requestAnimationFrame(()=>{
        this._runRenderLoop(mapMovement, map, renderer, scene, camera);
      });
    }

    private initTmlib(callback:Function) {

      var ASSETS = {
      };

      var characterImages = MongoCollections.CharacterImages.find({useForNovel:true}).fetch();
      var backgroundImages = MongoCollections.BackgroundImages.find().fetch();
      for(var key in characterImages) {
        if ("" !== characterImages[key].portraitImageUrl) {
          ASSETS[characterImages[key].portraitImageUrl] = characterImages[key].portraitImageUrl;
        }
      }
      for(var key in backgroundImages) {
        if ("" !== backgroundImages[key].imageUrl) {
          ASSETS[backgroundImages[key].imageUrl] = backgroundImages[key].imageUrl;
        }
      }
      var bgmAudios = MongoCollections.BgmAudios.find().fetch();
      bgmAudios.forEach((bgmAudio)=>{
        if (bgmAudio.identifier === 'none') {
          return;
        }
        ASSETS[bgmAudio.identifier] = bgmAudio.audioUrl;
      });
      var soundEffectAudios = MongoCollections.SoundEffectAudios.find().fetch();
      soundEffectAudios.forEach((soundEffectAudio)=>{
        if (soundEffectAudio.identifier === 'none') {
          return;
        }
        ASSETS[soundEffectAudio.identifier] = soundEffectAudio.audioUrl;
      });
      // main
      tm.main(function() {
        // キャンバスアプリケーションを生成
        var app = tm.display.CanvasApp("#tmlibCanvas");
        app.background = 'rgba(0,0,0,0)';
        // リサイズ
        app.resize(Game.SCREEN_WIDTH, Game.SCREEN_HEIGHT);
        // ウィンドウにフィットさせる
//        app.fitWindow();

        // ローダーでアセットを読み込む
        var loading = tm.game.LoadingScene({
          assets: ASSETS,
          width: Game.SCREEN_WIDTH,
          height: Game.SCREEN_HEIGHT,
        });

        // 読み込み完了後に呼ばれるメソッドを登録
        loading.onload = function() {
          // メインシーンに入れ替える
          var scene = window.MainScene();
          app.replaceScene(scene);
          callback();
        };
        // ローディングシーンに入れ替える
        app.replaceScene(loading);

        // 実行
        app.run();

        var aspect = Game.SCREEN_WIDTH / Game.SCREEN_HEIGHT;

        window.addEventListener("resize", function(e) {
          var windowAspect = $(e.target).width() / $(e.target).height();

          if (windowAspect > aspect) {
            var newWidth:number = $(e.target).height() * aspect;
            var newHeight:number = <number>$(e.target).height();
          } else {
            var newWidth:number = <number>$(e.target).width();
            var newHeight:number = $(e.target).width() * 1/aspect;
          }

          var scale = newWidth / Game.SCREEN_WIDTH;

          var translateX = Game.SCREEN_WIDTH * (1-scale) / 2;

          var translateY = Game.SCREEN_HEIGHT * (1-scale) / 2;

          var value =
              'translateX(' + -translateX + 'px) ' +
              'translateY(' + -translateY + 'px)' +
              'scale(' + scale + ', ' + scale + ') ';
          $('#tmlibCanvas').css('transform', value);
          $('#game-ui-body').css('transform', value);

        });
      });



      if (document.readyState == "complete") {
        if (!document.createEvent) {
          window.fireEvent('onload');
        } else {
          var event = document.createEvent('HTMLEvents');
          event.initEvent ("load", false, true)
          window.dispatchEvent(event);
        }
      }

    }

    private initUserFunctions() {
      var userFunctionManager = WrtGame.UserFunctionsManager.getInstance();
    }

    /**
     * MapMovementクラスが返すプレーヤー座標を、BabylonJSでの表示仕様を満たす座標に変換する
     * @param x
     * @param h
     * @param y
     * @returns {BABYLON.Vector3}
     */
    private convertBabylonPlayerPosition(x:number, h:number, y:number, angle:number):BABYLON.Vector3 {

      // プレーヤーが0.5後ろに下がって、背中が後ろのマスの壁にひっつくようにするためのオフセット座標
      var rotateMtx = BABYLON.Matrix.RotationY(angle);
      var viewPosOffset = new BABYLON.Vector3(0, 0, -0.5);

      // そのオフセット座標を、プレーヤーの向きに合わせて回転する
      viewPosOffset = BABYLON.Vector3.TransformCoordinates(viewPosOffset, rotateMtx);

      // プレーヤーのBabylonJSにおける位置座標
      var viewPos = new BABYLON.Vector3(x - 0.5, h + 0.5, -1 * y + 0.5);

      // オフセットを考慮するために足す
      return viewPos.add(viewPosOffset);
    }


    /**
     * MapMovementクラスが返すプレーヤー座標を、GLBoostでの表示仕様を満たす座標に変換する
     * @param x
     * @param h
     * @param y
     * @returns {BABYLON.Vector3}
     */
    private convertGLBoostPlayerPosition(x:number, h:number, y:number, angle:number, playerElevationAngle:number):any {

      // プレーヤーが0.5後ろに下がって、背中が後ろのマスの壁にひっつくようにするためのオフセット座標
      var rotateMtx = GLBoost.Matrix44.rotateY(-angle);
      var rotateElevationMtx = GLBoost.Matrix44.rotateX(playerElevationAngle);
      var viewPosOffset = new GLBoost.Vector4(0, 0, 0.5, 1);
      var centerPosOffset = new GLBoost.Vector4(0, 0, -0.5, 1);

      // そのオフセット座標を、プレーヤーの向きに合わせて回転する
      viewPosOffset = rotateMtx.multiplyVector(viewPosOffset);
      centerPosOffset = rotateElevationMtx.multiplyVector(centerPosOffset);
      centerPosOffset = rotateMtx.multiplyVector(centerPosOffset);

      // プレーヤーのBabylonJSにおける位置座標
      var viewPos = new GLBoost.Vector3(x - 0.5, h + 0.5, y - 0.5);
      //var viewPos = new GLBoost.Vector3(x, h + 1, y);

      // オフセットを考慮するために足す
      return {
        viewPos: GLBoost.Vector3.add(viewPos, new GLBoost.Vector3(viewPosOffset.x, viewPosOffset.y, viewPosOffset.z)),
        centerPos: GLBoost.Vector3.add(viewPos, new GLBoost.Vector3(centerPosOffset.x, centerPosOffset.y, centerPosOffset.z))
      };
    }

    private runRenderLoop(mapMovement:MapMovement, map:Map, scene:BABYLON.Scene, camera:BABYLON.FreeCamera) {

      // 平行移動する
      var moveDelta = 1.0/60*3;
      mapMovement.move(map, moveDelta);

      // 水平方向の向きを変える
      mapMovement.rotate(60*0.8);

      // 垂直方向の向きを変える
      mapMovement.faceUpOrLow(1/60*0.5);

      map.movePlatforms();

      // カメラの位置・回転をセット
      camera.position = this.convertBabylonPlayerPosition(mapMovement.playerX, mapMovement.playerH, mapMovement.playerY, mapMovement.playerAngle);
      camera.rotation = new BABYLON.Vector3(-1*mapMovement.playerElevationAngle, mapMovement.playerAngle, 0);

      // シーンをレンダリングする
      scene.render();
    }

    public clear() {
      var novelPlayer = WrtGame.NovelPlayer.getInstance();
      novelPlayer.clear();
    }

  }

}
