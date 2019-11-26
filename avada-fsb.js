(async function() {
  let fsb_wrapper_el;
  let fsb_bg_el;
  let fsb_content_el;

  const pagesRegex = {
    home: '^/$',
    products: '^/products',
    collections: '^/collections',
    cart: '^/cart$',
    blog: '^/blogs',
    cms_pages: '^/pages'
  };

  function initBar(bar) {
    resetFsbWrapper();
    createWrapper(bar);
    createBackground(bar);
    createContent(bar);
    insertFsbToDom(bar);
  }

  function resetFsbWrapper() {
    const avada_fsb_wrapper = document.getElementById('avada-fsb-wrapper');
    if (avada_fsb_wrapper) avada_fsb_wrapper.remove();
  }

  function insertFsbToDom(bar) {
    fsb_bg_el.append(fsb_content_el);
    fsb_wrapper_el.append(fsb_bg_el);
    if (bar.position === 'top_page') {
      document.querySelector('#shopify-section-header').prepend(fsb_wrapper_el);
    } else {
      document.querySelector('body').append(fsb_wrapper_el);
    }
  }

  function createWrapper(bar) {
    fsb_wrapper_el = document.createElement('a');
    fsb_wrapper_el.id = 'avada-fsb-wrapper';
    fsb_wrapper_el.style.display = 'block';
    fsb_wrapper_el.style.color = 'inherit';
    if (bar.clickable) {
      fsb_wrapper_el.setAttribute('href', bar['link_url']);
      if (bar['open_new_tab']) fsb_wrapper_el.setAttribute('target', '_blank');
    }
  }

  function createBackground(bar) {
    fsb_bg_el = document.createElement('div');
    fsb_bg_el.id = 'avada-fsb-background';
    fsb_bg_el.style.left = '0px';
    fsb_bg_el.style.height = 'auto';
    fsb_bg_el.style.width = '100%';
    fsb_bg_el.style.zIndex = '9999999';
    if (bar.position === 'fixed_top') {
      fsb_bg_el.style.position = 'fixed';
      fsb_bg_el.style.top = '0px';
    }
    if (bar.position === 'fixed_bottom') {
      fsb_bg_el.style.position = 'fixed';
      fsb_bg_el.style.bottom = '0px';
    }
    if (bar === 'top_page') {
      fsb_bg_el.style.position = 'relative';
    }
  }

  function createContent(bar) {
    fsb_content_el = document.createElement('div');
    fsb_content_el.id = 'avada-fsb-content';
    fsb_content_el.style.textAlign = 'center';
    fsb_content_el.style.color = bar['text-color'];
    fsb_content_el.style.fontfamily = bar['font'];
    fsb_content_el.style.fontSize = `${bar['font_size']}px`;
  }

  function displayMessage(message, symbol, type, value) {
    if (type === 'initial_message') {
      const [symbolSpan, valueSpan] = createSymbolAndValueEles(symbol, value);
      message = message.replace('{!!currency_code!!}', symbolSpan.outerHTML);
      message = message.replace('{!!goal!!}', valueSpan.outerHTML);
    }
    if (type === 'below_goal_message') {
      const [symbolSpan, valueSpan] = createSymbolAndValueEles(symbol, value);
      message = message.replace('{!!currency_code!!}', symbolSpan.outerHTML);
      message = message.replace('{!!below_goal!!}', valueSpan.outerHTML);
    }
    if (type === 'achieve_goal_message') {
      return message;
    }

    return message;
  }

  function createSymbolAndValueEles(symbol, value) {
    const symbolSpan = document.createElement('span');
    symbolSpan.id = 'avada-fsb-symbol';
    symbolSpan.innerText = symbol;

    const valueSpan = document.createElement('span');
    valueSpan.id = 'avada-fsb-value';
    valueSpan.innerText = value;

    return [symbolSpan, valueSpan];
  }

  async function displayShippingBars(ajaxTotal = null) {
    const total = ajaxTotal ? ajaxTotal : AVADA_FSB.cart / 100;
    for (let i = 0; i < AVADA_FSB.bars.length; i++) {
      const bar = AVADA_FSB.bars[i];
      const validCountry = await checkValidCountries(bar);
      if (!validCountry) continue;
      if (checkInvalidDate(bar)) continue;
      if (!checkValidDisplayPage(bar)) continue;
      initBar(bar);
      fsb_bg_el.style.backgroundColor = bar.background_color;
      fsb_bg_el.style.backgroundImage = `url('${bar.background_image}')`;
      fsb_content_el.style.padding = `${bar.padding}px`;

      const goal = bar.goal;
      if (total === 0) {
        fsb_content_el.innerHTML = displayMessage(
          bar.initial_message,
          bar.currency_code,
          'initial_message',
          goal
        );
      }
      if (total < goal && total !== 0) {
        fsb_content_el.innerHTML = displayMessage(
          bar.below_goal_message,
          bar.currency_code,
          'below_goal_message',
          goal - total
        );
      }
      if (total >= goal) {
        fsb_content_el.innerHTML = bar.achieve_goal_message;
      }
      fsb_content_el.style.color = bar.text_color;
      fsb_content_el.querySelector('#avada-fsb-symbol').style.color =
        bar.goal_text_color;
      fsb_content_el.querySelector('#avada-fsb-value').style.color =
        bar.goal_text_color;
    }
  }

  function checkInvalidDate(bar) {
    const today = new Date().getTime();
    const {fromDate, toDate} = bar;
    if (!fromDate && !toDate) {
      return false;
    }
    if (fromDate && !toDate) {
      return today < fromDate;
    }
    if (fromDate && toDate) {
      return fromDate < toDate && (today > toDate || today < fromDate);
    }
    if (toDate && !fromDate) {
      return true;
    }
  }

  async function checkValidCountries(bar) {
    if (bar.countries_all) return true;

    const data = await fetch('https://get.geojs.io/v1/ip/geo.json');
    const geoData = await data.json();
    const countryCode = geoData.country_code;

    return bar.countries.indexOf(countryCode) >= 0;
  }

  displayShippingBars();

  function checkValidDisplayPage(bar) {
    const currentPath = window.location.pathname;
    const {
      includesPages,
      customIncludeUrls,
      excludesPages,
      customExcludeUrls
    } = bar;

    if (bar['allow_show'] === 'all') {
      return checkExcludes(excludesPages, currentPath, customExcludeUrls);
    }
    if (bar['allow_show'] === 'specific') {
      let canDisplay = true;
      canDisplay = checkExcludes(excludesPages, currentPath, customExcludeUrls);
      if (canDisplay) {
        canDisplay = false;
        canDisplay = checkIncludes(
          includesPages,
          currentPath,
          customIncludeUrls
        );
      }

      return canDisplay;
    }
  }

  function checkExcludes(excludesPages, currentPath, customExcludeUrls) {
    let canDisplay = true;
    customExcludeUrls = customExcludeUrls.split('\n');
    for (let i = 0; i < customExcludeUrls.length; i++) {
      if (currentPath === customExcludeUrls[i]) {
        canDisplay = false;
        break;
      }
    }
    if (canDisplay) {
      for (let i = 0; i < excludesPages.length; i++) {
        const pattern = pagesRegex[excludesPages[i]];
        if (!pattern) return (canDisplay = true);
        const reg = new RegExp(pattern);
        const result = reg.test(currentPath);
        if (result) {
          canDisplay = !result;
          break;
        }
      }
    }

    return canDisplay;
  }

  function checkIncludes(includesPages, currentPath, customIncludeUrls) {
    let canDisplay = false;
    customIncludeUrls = customIncludeUrls.split('\n');
    for (let i = 0; i < customIncludeUrls.length; i++) {
      if (currentPath === customIncludeUrls[i]) {
        canDisplay = true;
        break;
      }
    }
    if (!canDisplay) {
      for (let i = 0; i < includesPages.length; i++) {
        const pattern = pagesRegex[includesPages[i]];
        if (!pattern) return (canDisplay = false);
        const reg = new RegExp(pattern);
        const result = reg.test(currentPath);
        if (result) {
          canDisplay = result;
          break;
        }
      }
    }

    return canDisplay;
  }
  // Handle the ajax cart here
  (function() {
    const send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function() {
      this.addEventListener('load', function() {
        if (this._url === '/cart.json' || this._url === '/cart.js') {
          const {total_price} = JSON.parse(this.responseText);
          displayShippingBars(total_price / 100);
        }
      });
      return send.apply(this, arguments);
    };
  })();
})();
