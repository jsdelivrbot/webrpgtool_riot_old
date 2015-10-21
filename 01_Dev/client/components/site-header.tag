<site-header>
  <div class="ui six item menu">
    <a class={item: true, active: isTop} id="header-navlink-top" href="#">WebRPGTool</a>
    <a class={item: true, active: isMaps} id="header-navlink-maps" href="#maps">マップ</a>
    <a class={item: true, active: isCodes} id="header-navlink-scripts" href="#codes">スクリプト</a>
    <a class={item: true, active: isStories} id="header-navlink-stories" href="#stories">ストーリー</a>
    <a class={item: true, active: isObjects} id="header-navlink-stories" href="#objects">オブジェクト</a>
    <div class="item" id="loginButtonsDiv"></div>
  </div>

  <script>
    this.isTop = opts.page === 'top';
    this.isMaps = opts.page === 'maps';
    this.isCodes = opts.page === 'codes';
    this.isStories = opts.page === 'stories';
    this.isObjects = opts.page === 'objects';

    this.on('mount', ()=> {
      var loginButtons = window.document.getElementById('loginButtonsDiv');
      if(loginButtons) {
        Blaze.render(Template.loginButtons, loginButtons);
      }
    });
  </script>

  <style scoped>
    #login-dropdown-list {
        right: 0px !important;
        left :auto;
    }
  </style>
</site-header>
