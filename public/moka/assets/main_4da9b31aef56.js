$(function () {

    "use strict";

    // Main navigation & mega menu
    // ----------------------------------------------------------------

    // Global menu variables

    var objSearch = $('.search-wrapper'),
        objLogin = $('.login-wrapper'),
        objCart = $('.cart-wrapper'),
        objMenu = $('.floating-menu'),
        objMenuLink = $('.floating-menu a'),
        $search = $('.open-search'),
        $login = $('.open-login'),
        $cart = $('.open-cart'),
        $menu = $('.open-menu'),
        $openDropdown = $('.open-dropdown'),
        $settingsItem = $('.nav-settings .nav-settings-list li'),
        $close = $('.close-menu');

    // Sticky header
    // ----------------------------------------------------------------

    var navbarFixedLogo = $('nav.navbar-fixed .logo img');
    var navWhiteLogo = $('#navWhiteLogo').attr('url');
    var navColoredLogo = $('#navColoredLogo').attr('url');

    // When reload page - check if page has offset
    if ($(document).scrollTop() > 94) {
        navbarFixedLogo.addClass('navbar-sticked');
    }
    // Add sticky menu on scroll
    $(document).on('bind ready scroll', function () {
        var docScroll = $(document).scrollTop();
        if (docScroll >= 10) {
            navbarFixedLogo.attr("src",navWhiteLogo);
        } else {
            navbarFixedLogo.attr("src",navColoredLogo);
        }
    });

});
