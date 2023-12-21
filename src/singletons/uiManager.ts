/* eslint-disable max-classes-per-file */
/**
 * /*! /////////////////////////////////////////////////////////////////////////////

 * http://keeptrack.space
 *
 * @Copyright (C) 2016-2023 Theodore Kruczek
 * @Copyright (C) 2020-2023 Heather Kruczek
 * @Copyright (C) 2015-2016, James Yoder
 *
 * Original source code released by James Yoder at https://github.com/jeyoder/ThingsInSpace/
 * under the MIT License. Please reference http://keeptrack.space/license/thingsinspace.txt
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General License for more details.
 *
 * You should have received a copy of the GNU Affero General License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { ColorInformation, ColorRuleSet, SatObject, ToastMsgType, UiManager } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { loadJquery } from '@app/singletons/ui-manager/jquery';
import '@materializecss/materialize';
import { Milliseconds } from 'ootk';
import { clickAndDragHeight, clickAndDragWidth } from '../lib/click-and-drag';
import { closeColorbox } from '../lib/colorbox';
import { MILLISECONDS_PER_SECOND } from '../lib/constants';
import { getClass } from '../lib/get-class';
import { getEl, hideEl, setInnerHtml, showEl } from '../lib/get-el';
import { rgbCss } from '../lib/rgbCss';
import { SpaceObjectType } from '../lib/space-object-type';
import { LegendManager } from '../static/legend-manager';
import { UiValidation } from '../static/ui-validation';
import { errorManagerInstance } from './errorManager';
import { MobileManager } from './mobileManager';
import { SearchManager } from './search-manager';

export class StandardUiManager implements UiManager {
  private static LONG_TIMER_DELAY = MILLISECONDS_PER_SECOND * 100;

  private isFooterVisible_ = true;
  private isInitialized_ = false;

  // materializecss/materialize goes to window.M, but we want a local reference
  M = window.M;
  bottomIconPress: (el: HTMLElement) => void;
  hideSideMenus: () => void;
  isAnalysisMenuOpen = false;
  isCurrentlyTyping = false;
  isUiVisible = false;
  lastBoxUpdateTime = 0;
  lastColorScheme: { (sat: SatObject, params?: any): ColorInformation; (sat: SatObject, params?: any): ColorInformation; name?: any };
  lastNextPassCalcSatId = 0;
  lastNextPassCalcSensorShortName: string;
  lastToast: string;
  lookAtLatLon: any;
  searchManager: SearchManager;
  updateInterval = 1000;
  updateNextPassOverlay: (arg0: boolean) => void;
  hoverSatId = -1;

  static fullscreenToggle() {
    if (!document.fullscreenElement) {
      document.documentElement?.requestFullscreen().catch((err) => {
        // Might fail on some browsers
        errorManagerInstance.debug(err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  /** This runs after the drawManagerInstance starts */
  static postStart() {
    UiValidation.initUiValidation();

    setTimeout(() => {
      document.querySelectorAll('img').forEach((img: any) => {
        if (img.src && !img.src.includes('.png') && !img.src.includes('.jpg')) {
          img.src = img.attributes.delayedsrc?.value;
        }
      });
    }, 0);

    // Enable Satbox Overlay
    if (settingsManager.enableHoverOverlay) {
      try {
        const hoverboxDOM = document.createElement('div');
        hoverboxDOM.innerHTML = `
        <div id="sat-hoverbox">
          <span id="sat-hoverbox1"></span>
          <br/>
          <span id="sat-hoverbox2"></span>
          <br/>
          <span id="sat-hoverbox3"></span>
        </div>`;

        getEl('keeptrack-canvas')?.parentElement?.append(hoverboxDOM);
      } catch {
        /* istanbul ignore next */
        console.debug('document.createElement() failed!');
      }
    }
  }

  dismissAllToasts() {
    this.activeToastList_.forEach((toast: any) => {
      toast.dismiss();
    });
  }

  private makeToast_(toastText: string, type: ToastMsgType, isLong = false) {
    if (settingsManager.isDisableToasts) return;

    let toastMsg = window.M.toast({
      unsafeHTML: toastText,
    });

    // Add an on click event to dismiss the toast
    toastMsg.$el[0].addEventListener('click', () => {
      toastMsg.dismiss();
    });

    toastMsg.$el[0].addEventListener('contextmenu', () => {
      this.dismissAllToasts();
    });

    type = type || 'standby';
    if (isLong) toastMsg.timeRemaining = StandardUiManager.LONG_TIMER_DELAY;
    switch (type) {
      case 'standby':
        toastMsg.$el[0].style.background = 'var(--statusDarkStandby)';
        keepTrackApi.getSoundManager()?.play('standby');
        break;
      case 'normal':
        toastMsg.$el[0].style.background = 'var(--statusDarkNormal)';
        keepTrackApi.getSoundManager()?.play('standby');
        break;
      case 'caution':
        toastMsg.$el[0].style.background = 'var(--statusDarkCaution)';
        keepTrackApi.getSoundManager()?.play('standby');
        break;
      case 'serious':
        toastMsg.$el[0].style.background = 'var(--statusDarkSerious)';
        keepTrackApi.getSoundManager()?.play('standby');
        break;
      case 'critical':
        toastMsg.$el[0].style.background = 'var(--statusDarkCritical)';
        keepTrackApi.getSoundManager()?.play('standby');
        break;
      case 'error':
        toastMsg.$el[0].style.background = 'var(--statusDarkCritical)';
        keepTrackApi.getSoundManager()?.play('error');
        break;
    }

    return toastMsg;
  }

  colorSchemeChangeAlert(newScheme: ColorRuleSet) {
    // Don't Make an alert the first time!
    if (!this.lastColorScheme) {
      this.lastColorScheme = newScheme;
      return;
    }

    // Don't make an alert unless something has really changed
    // Check if the name of the lastColorScheme function is the same as the name of the new color scheme
    if (this.lastColorScheme.name == newScheme.name) return;

    // record the new color scheme
    this.lastColorScheme = newScheme;
    // Make an alert
    switch (newScheme.name) {
      case 'default':
      case 'group':
        this.toast(`Color Scheme Changed to Object Types`, 'normal', false);
        break;
      case 'velocity':
        this.toast(`Color Scheme Changed to Velocity`, 'normal', false);
        break;
      case 'sunlight':
        this.toast(`Color Scheme Changed to Sunlight`, 'normal', false);
        break;
      case 'countries':
      case 'groupCountries':
        this.toast(`Color Scheme Changed to Countries`, 'normal', false);
        break;
      case 'leo':
        this.toast(`Color Scheme Changed to Near Earth`, 'normal', false);
        break;
      case 'geo':
        this.toast(`Color Scheme Changed to Deep Space`, 'normal', false);
        break;
      case 'ageOfElset':
        this.toast(`Color Scheme Changed to Elset Age`, 'normal', false);
        break;
      case 'rcs':
        this.toast(`Color Scheme Changed to Radar Cross Section`, 'normal', false);
        break;
      case 'smallsats':
        this.toast(`Color Scheme Changed to Small Satellites`, 'normal', false);
        break;
      case 'lostobjects':
        this.toast(`Color Scheme Changed to Lost Objects`, 'normal', false);
        break;
      case 'neighbors':
        this.toast(`Color Scheme Changed to Orbit Density`, 'normal', false);
        break;
      default:
        this.toast(`Color Scheme Changed to ${newScheme.name}`, 'normal', false);
        console.debug(`${newScheme.name} missing from alert list!`);
        break;
    }
  }

  doSearch(searchString: string, isPreventDropDown?: boolean) {
    this.searchManager.doSearch(searchString, isPreventDropDown);
  }

  footerToggle() {
    if (this.isFooterVisible_) {
      this.isFooterVisible_ = false;
      getEl('sat-infobox')?.classList.add('sat-infobox-fullsize');
      getEl('nav-footer')?.classList.add('footer-slide-trans');
      getEl('nav-footer')?.classList.remove('footer-slide-up');
      getEl('nav-footer')?.classList.add('footer-slide-down');
      setInnerHtml('nav-footer-toggle', '&#x25B2;');
    } else {
      this.isFooterVisible_ = true;
      getEl('sat-infobox')?.classList.remove('sat-infobox-fullsize');
      getEl('nav-footer')?.classList.add('footer-slide-trans');
      getEl('nav-footer')?.classList.remove('footer-slide-down');
      getEl('nav-footer')?.classList.add('footer-slide-up');
      setInnerHtml('nav-footer-toggle', '&#x25BC;');
    }
    // After 1 second the transition should be complete so lets stop moving slowly
    setTimeout(() => {
      getEl('nav-footer')?.classList.remove('footer-slide-trans');
    }, 1000);
  }

  hideUi() {
    if (this.isUiVisible) {
      hideEl('keeptrack-header');
      hideEl('ui-wrapper');
      hideEl('nav-footer');
      this.isUiVisible = false;
    } else {
      showEl('keeptrack-header');
      showEl('ui-wrapper');
      showEl('nav-footer');
      this.isUiVisible = true;
    }
  }

  init() {
    if (this.isInitialized_) throw new Error('UiManager already initialized');
    loadJquery();

    this.searchManager = new SearchManager(this);

    if (settingsManager.isShowLogo) getEl('demo-logo')?.classList.remove('start-hidden');

    keepTrackApi.methods.uiManagerInit();

    StandardUiManager.initBottomMenuResizing_();

    // Initialize Navigation and Select Menus
    let elems = document.querySelectorAll('.dropdown-button');
    window.M.Dropdown.init(elems);
    this.isInitialized_ = true;
  }

  initMenuController() {
    getEl('legend-hover-menu')?.addEventListener('click', (e: any) => {
      if (e.target.classList[1]) {
        this.legendHoverMenuClick(e.target.classList[1]);
      }
    });

    getEl('legend-menu')?.addEventListener('click', () => {
      if (settingsManager.legendMenuOpen) {
        // Closing Legend Menu
        hideEl('legend-hover-menu');
        getEl('legend-icon')?.classList.remove('bmenu-item-selected');
        settingsManager.legendMenuOpen = false;
      } else {
        // Opening Legend Menu

        if (getEl('legend-hover-menu')?.innerHTML.length === 0) {
          // TODO: Figure out why it is empty sometimes
          errorManagerInstance.debug('Legend Menu is Empty');
          LegendManager.change('default');
        }

        showEl('legend-hover-menu');
        getEl('legend-icon')?.classList.add('bmenu-item-selected');
        this.searchManager.hideResults();
        settingsManager.legendMenuOpen = true;
      }
    });

    // const MenuSelectable = document.querySelector('.menu-selectable');
    // MenuSelectable &&
    //   MenuSelectable.addEventListener('click', () => {
    //     const catalogManagerInstance = keepTrackApi.getCatalogManager();
    //     if (catalogManagerInstance.selectedSat !== -1) {
    //       getEl('menu-lookangles').classList.remove('bmenu-item-disabled');
    //       getEl('menu-satview').classList.remove('bmenu-item-disabled');
    //     }
    //   });

    // Resizing Listener
    window.addEventListener('resize', () => {
      MobileManager.checkMobileMode();
      // if (!settingsManager.disableUI) {
      //   const bodyDOM = getEl('bodyDOM');
      //   if (keepTrackApi.programs.screenShotManager.checkForQueuedScreenshot()) {
      //     bodyDOM.style.overflow = 'visible';
      //     getEl('canvas-holder').style.overflow = 'visible';
      //     getEl('canvas-holder').style.width = '3840px';
      //     getEl('canvas-holder').style.height = '2160px';
      //     bodyDOM.style.width = '3840px';
      //     bodyDOM.style.height = '2160px';
      //   } else {
      //     bodyDOM.style.overflow = 'hidden';
      //     getEl('canvas-holder').style.overflow = 'hidden';
      //   }
      // }
      settingsManager.isResizing = true;
    });

    this.addSearchEventListeners_();

    getEl('fullscreen-icon')?.addEventListener('click', () => {
      StandardUiManager.fullscreenToggle();
    });

    getEl('nav-footer-toggle')?.addEventListener('click', () => {
      this.footerToggle();
      const navFooterDom = getEl('nav-footer');
      if (navFooterDom && parseInt(window.getComputedStyle(navFooterDom).bottom.replace('px', '')) < 0) {
        setTimeout(() => {
          const bottomHeight = getEl('bottom-icons-container')?.offsetHeight;
          document.documentElement.style.setProperty('--bottom-menu-top', bottomHeight + 'px');
        }, 1000); // Wait for the footer to be fully visible.
      } else {
        // If the footer is open, then it will be hidden shortly but we don't want to wait for it to be hidden
        document.documentElement.style.setProperty('--bottom-menu-top', '0px');
      }
    });

    clickAndDragWidth(getEl('settings-menu'));
    clickAndDragWidth(getEl('about-menu'));
  }

  private addSearchEventListeners_() {
    getEl('search-icon')?.addEventListener('click', () => {
      this.searchManager.searchToggle();
    });

    getEl('search')?.addEventListener('focus', () => {
      this.isCurrentlyTyping = true;
    });
    getEl('ui-wrapper')?.addEventListener('focusin', () => {
      this.isCurrentlyTyping = true;
    });

    getEl('search')?.addEventListener('blur', () => {
      this.isCurrentlyTyping = false;
    });
    getEl('ui-wrapper')?.addEventListener('focusout', () => {
      this.isCurrentlyTyping = false;
    });

    getEl('search-results')?.addEventListener('click', (evt: Event) => {
      let satId = StandardUiManager.getSatIdFromSearchResults_(evt);
      if (isNaN(satId) || satId === -1) return;

      const catalogManagerInstance = keepTrackApi.getCatalogManager();
      const sat = catalogManagerInstance.getSat(satId);
      if (sat?.type === SpaceObjectType.STAR) {
        catalogManagerInstance.panToStar(sat);
      } else {
        catalogManagerInstance.setSelectedSat(satId);
      }
    });

    getEl('search-results')?.addEventListener('mouseover', (evt) => {
      let satId = StandardUiManager.getSatIdFromSearchResults_(evt);
      if (isNaN(satId) || satId === -1) return;

      keepTrackApi.getHoverManager().setHoverId(satId);
      this.hoverSatId = satId;
    });
    getEl('search-results')?.addEventListener('mouseout', () => {
      keepTrackApi.getHoverManager().setHoverId(-1);
      this.hoverSatId = -1;
    });

    getEl('search')?.addEventListener('input', () => {
      const searchStr = (<HTMLInputElement>getEl('search')).value;
      this.doSearch(searchStr);
    });
  }

  private static getSatIdFromSearchResults_(evt: Event) {
    let satId = -1;
    if ((<HTMLElement>evt.target).classList.contains('search-result')) {
      const satIdStr = (<HTMLElement>evt.target).dataset.objId;
      satId = satIdStr ? parseInt(satIdStr) : -1;
    } else if ((<HTMLElement>evt.target).parentElement?.classList.contains('search-result')) {
      const satIdStr = (<HTMLElement>evt.target).parentElement?.dataset.objId;
      satId = satIdStr ? parseInt(satIdStr) : -1;
    } else if ((<HTMLElement>evt.target).parentElement?.parentElement?.classList.contains('search-result')) {
      const satIdStr = (<HTMLElement>evt.target).parentElement?.parentElement?.dataset.objId;
      satId = satIdStr ? parseInt(satIdStr) : -1;
    }
    return satId;
  }

  legendHoverMenuClick(legendType: string) {
    const colorSchemeManagerInstance = keepTrackApi.getColorSchemeManager();

    console.log(this.isUiVisible);
    const slug = legendType.split('-')[1];

    if (slug.startsWith('velocity')) {
      let colorString: [number, number, number, number];
      switch (slug) {
        case 'velocityFast':
          colorString = [0.75, 0.75, 0, 1];
          break;
        case 'velocityMed':
          colorString = [0.75, 0.25, 0, 1];
          break;
        case 'velocitySlow':
          colorString = [1.0, 0, 0.0, 1.0];
          break;
      }
      if (colorSchemeManagerInstance.objectTypeFlags[slug]) {
        colorSchemeManagerInstance.objectTypeFlags[slug] = false;
        getClass(`legend-${slug}-box`).forEach((el) => {
          el.style.background = 'black';
        });
      } else {
        colorSchemeManagerInstance.objectTypeFlags[slug] = true;
        getClass(`legend-${slug}-box`).forEach((el) => {
          el.style.background = rgbCss(colorString).toString();
        });
      }
    } else {
      if (colorSchemeManagerInstance.objectTypeFlags[slug]) {
        colorSchemeManagerInstance.objectTypeFlags[slug] = false;
        getClass(`legend-${slug}-box`).forEach((el) => {
          el.style.background = 'black';
        });
      } else {
        colorSchemeManagerInstance.objectTypeFlags[slug] = true;
        getClass(`legend-${slug}-box`).forEach((el) => {
          const color = settingsManager.colors?.[slug];
          if (!color) {
            errorManagerInstance.debug(`Color not found for ${slug}`);
          } else {
            el.style.background = rgbCss(color);
          }
        });
      }
    }

    colorSchemeManagerInstance.setColorScheme(colorSchemeManagerInstance.currentColorScheme, true);
  }

  onReady() {
    // Code Once index.htm is loaded
    if (settingsManager.offline) this.updateInterval = 250;

    // Setup Legend Colors
    LegendManager.legendColorsChange();

    // Run any plugins code
    keepTrackApi.methods.uiManagerOnReady();
    this.bottomIconPress = (el: HTMLElement) => keepTrackApi.methods.bottomMenuClick(el.id);
    const BottomIcons = getEl('bottom-icons');
    BottomIcons?.addEventListener('click', (evt: Event) => {
      if ((<HTMLElement>evt.target).id === 'bottom-icons') return;
      if ((<HTMLElement>evt.target).parentElement?.id === 'bottom-icons') {
        this.bottomIconPress(<HTMLElement>evt.target);
      } else {
        const parentElement = (<HTMLElement>evt.target).parentElement;
        if (!parentElement) {
          errorManagerInstance.debug('parentElement is null');
        } else {
          this.bottomIconPress(parentElement);
        }
      }
    });
    this.hideSideMenus = () => {
      closeColorbox();
      keepTrackApi.methods.hideSideMenus();
    };
  }

  toast(toastText: string, type: ToastMsgType, isLong = false) {
    this.lastToast = toastText;
    const toastMsg = this.makeToast_(toastText, type, isLong);
    this.activeToastList_.push(toastMsg);
  }

  private activeToastList_: any[] = [];

  /**
   * Checks if enough time has elapsed and then calls all queued updateSelectBox callbacks
   */
  updateSelectBox(realTime: Milliseconds, lastBoxUpdateTime: Milliseconds, sat: SatObject): void {
    if (typeof sat === 'undefined' || sat.static) return;

    if (realTime * 1 > lastBoxUpdateTime * 1 + this.updateInterval) {
      keepTrackApi.methods.updateSelectBox(sat);
      keepTrackApi.getTimeManager().lastBoxUpdateTime = realTime;
    }
  }

  private static initBottomMenuResizing_() {
    // Allow Resizing the bottom menu
    const maxHeight = getEl('bottom-icons') !== null ? getEl('bottom-icons')?.offsetHeight : 0;
    const bottomIconsContainerDom = getEl('bottom-icons-container');

    if (!bottomIconsContainerDom) {
      errorManagerInstance.debug('bottomIconsContainerDom is null');
    } else {
      clickAndDragHeight(bottomIconsContainerDom, maxHeight, () => {
        let bottomHeight = bottomIconsContainerDom.offsetHeight;
        document.documentElement.style.setProperty('--bottom-menu-height', bottomHeight + 'px');
        const navFooterDom = getEl('nav-footer');
        if (navFooterDom && window.getComputedStyle(navFooterDom).bottom !== '0px') {
          document.documentElement.style.setProperty('--bottom-menu-top', '0px');
        } else {
          bottomHeight = bottomIconsContainerDom.offsetHeight;
          document.documentElement.style.setProperty('--bottom-menu-top', bottomHeight + 'px');
        }
      });
    }
  }
}
