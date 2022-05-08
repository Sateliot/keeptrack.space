import editPng from '@app/img/icons/edit.png';
import { keepTrackApi } from '@app/js/api/keepTrackApi';
import { RAD2DEG } from '@app/js/lib/constants';
import { saveAs, stringPad } from '@app/js/lib/helpers';
import { StringifiedNubmer } from '@app/js/satMath/tleFormater';
import $ from 'jquery';

let isEditSatMenuOpen = false;
export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'editSat',
    cb: () => uiManagerInit(),
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'editSat',
    cb: (iconName: string): void => bottomMenuClick(iconName),
  });

  keepTrackApi.register({
    method: 'rmbMenuActions',
    cbName: 'editSat',
    cb: (iconName: string, clickedSat: any): void => rmbMenuActions(iconName, clickedSat),
  });

  keepTrackApi.register({
    method: 'hideSideMenus',
    cbName: 'editSat',
    cb: (): void => hideSideMenus(),
  });
};

export const uiManagerInit = (): void => {
  // Side Menu
  $('#left-menus').append(keepTrackApi.html`
    <div id="editSat-menu" class="side-menu-parent start-hidden text-select">
      <div id="editSat-content" class="side-menu">
        <div class="row">
          <h5 class="center-align">Edit Satellite</h5>
          <form id="editSat">
            <div class="input-field col s12">
              <input disabled value="AAAAA" id="es-scc" type="text" maxlength="5" />
              <label for="disabled" class="active">Satellite SCC#</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AA" id="es-year" type="text" maxlength="2" />
              <label for="es-year" class="active">Epoch Year</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAAAAAA" id="es-day" type="text" maxlength="12" />
              <label for="es-day" class="active">Epoch Day</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAA" id="es-inc" type="text" maxlength="8" />
              <label for="es-inc" class="active">Inclination</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAA" id="es-rasc" type="text" maxlength="8" />
              <label for="es-rasc" class="active">Right Ascension</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAA" id="es-meanmo" type="text" maxlength="11" />
              <label for="es-meanmo" class="active">Mean Motion</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AA.AAAAAAAA" id="es-ecen" type="text" maxlength="7" />
              <label for="es-ecen" class="active">Eccentricity</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AA.AAAAAAAA" id="es-argPe" type="text" maxlength="8" />
              <label for="es-argPe" class="active">Argument of Perigee</label>
            </div>
            <div class="input-field col s12">
              <input placeholder="AAA.AAAA" id="es-meana" type="text" maxlength="8" />
              <label for="es-meana" class="active">Mean Anomaly</label>
            </div>
            <div class="center-align row">
              <button id="editSat-submit" class="btn btn-ui waves-effect waves-light" type="submit" name="action">Update Satellite &#9658;</button>
            </div>
            <div class="center-align row">
              <button id="editSat-newTLE" class="btn btn-ui waves-effect waves-light" type="button" name="action">Update Epoch to Now &#9658;</button>
            </div>
            <div class="center-align row">
              <button id="editSat-save" class="btn btn-ui waves-effect waves-light" type="button" name="action">Save TLE &#9658;</button>
            </div>
            <div class="center-align row">
              <button id="editSat-open" class="btn btn-ui waves-effect waves-light" type="button" name="action">Load TLE &#9658;</button>
              <input id="editSat-file" class="start-hidden" type="file" name="files[]" />
            </div>
          </form>
        </div>
        <div id="es-error" class="center-align menu-selectable start-hidden">
          <h6 class="center-align">Error</h6>
        </div>
      </div>
    </div>
  `);

  // Bottom Icon
  $('#bottom-icons').append(keepTrackApi.html`
    <div id="menu-editSat" class="bmenu-item bmenu-item-disabled">
      <img
        alt="edit"
        src="${editPng}"/>
      <span class="bmenu-title">Edit Satellite</span>
      <div class="status-icon"></div>
    </div>
  `);

  $('#editSat-menu').resizable({
    handles: 'e',
    stop: function () {
      $(this).css('height', '');
    },
    maxWidth: 450,
    minWidth: 280,
  });

  $('#editSat-newTLE').on('click', editSatNewTleClick);

  $('#editSat').on('submit', editSatSubmit);

  $('#editSat-save').on('click', editSatSaveClick);

  $('#editSat-open').on('click', function () {
    $('#editSat-file').trigger('click');
  });

  $('#editSat-file').on('change', function (evt: Event) {
    if (!window.FileReader) return; // Browser is not compatible
    doReaderActions(evt);
    evt.preventDefault();
  });

  $('#es-error').on('click', function () {
    $('#es-error').hide();
  });
};

export const doReaderActions = (evt: Event) => {
  try {
    const reader = new FileReader();
    reader.onload = readerOnLoad;
    reader.readAsText((<any>evt.target).files[0]);
  } catch (e) {
    // Intentionally left blank
  }
};

export const readerOnLoad = (evt: any) => {
  const { satellite, timeManager, orbitManager, satSet } = keepTrackApi.programs;
  if (evt.target.readyState !== 2) return;
  if (evt.target.error) {
    console.log('error');
    return;
  }

  const object = JSON.parse(<string>evt.target.result);
  const scc = parseInt(stringPad.pad0(object.TLE1.substr(2, 5).trim(), 5));
  const satId = satSet.getIdFromObjNum(scc);
  const sat = satSet.getSatExtraOnly(satId);
  if (satellite.altitudeCheck(object.TLE1, object.TLE2, timeManager.simulationTimeObj) > 1) {
    satSet.satCruncher.postMessage({
      typ: 'satEdit',
      id: sat.id,
      active: true,
      TLE1: object.TLE1,
      TLE2: object.TLE2,
    });
    orbitManager.updateOrbitBuffer(sat.id, true, object.TLE1, object.TLE2);
    sat.active = true;
  } else {
    $('#es-error').html('Failed Altitude Check</br>Try Different Parameters');
    $('#es-error').show();
  }
};

export const bottomMenuClick = (iconName: string) => {
  // NOSONAR
  const { uiManager, satSet, objectManager } = keepTrackApi.programs;
  if (iconName === 'menu-editSat') {
    if (isEditSatMenuOpen) {
      isEditSatMenuOpen = false;
      uiManager.hideSideMenus();
      return;
    } else {
      if (objectManager.selectedSat !== -1) {
        if (settingsManager.isMobileModeEnabled) uiManager.searchToggle(false);
        uiManager.hideSideMenus();
        $('#editSat-menu').effect('slide', { direction: 'left', mode: 'show' }, 1000);
        $('#menu-editSat').addClass('bmenu-item-selected');
        isEditSatMenuOpen = true;

        const sat = satSet.getSatExtraOnly(objectManager.selectedSat);
        $('#es-scc').val(sat.sccNum);

        let inc: string | string[] = (sat.inclination * RAD2DEG).toPrecision(7);
        inc = inc.split('.');
        inc[0] = inc[0].substr(-3, 3);
        inc[1] = inc[1].substr(0, 4);
        inc = (inc[0] + '.' + inc[1]).toString();

        $('#es-inc').val(stringPad.pad0(inc, 8));
        $('#es-year').val(sat.TLE1.substr(18, 2));
        $('#es-day').val(sat.TLE1.substr(20, 12));
        $('#es-meanmo').val(sat.TLE2.substr(52, 11));

        let rasc: string | string[] = (sat.raan * RAD2DEG).toPrecision(7);
        rasc = rasc.split('.');
        rasc[0] = rasc[0].substr(-3, 3);
        rasc[1] = rasc[1].substr(0, 4);
        rasc = (rasc[0] + '.' + rasc[1]).toString();

        $('#es-rasc').val(stringPad.pad0(rasc, 8));
        $('#es-ecen').val(sat.eccentricity.toPrecision(7).substr(2, 7));

        let argPe: string | string[] = (sat.argPe * RAD2DEG).toPrecision(7);
        argPe = argPe.split('.');
        argPe[0] = argPe[0].substr(-3, 3);
        argPe[1] = argPe[1].substr(0, 4);
        argPe = (argPe[0] + '.' + argPe[1]).toString();

        $('#es-argPe').val(stringPad.pad0(argPe, 8));
        $('#es-meana').val(sat.TLE2.substr(44 - 1, 7 + 1));
      } else {
        if (settingsManager.plugins?.topMenu) keepTrackApi.programs.adviceManager.adviceList.editSatDisabled();
        uiManager.toast(`Select a Satellite First!`, 'caution');
        if (!$('#menu-editSat:animated').length) {
          $('#menu-editSat').effect('shake', {
            distance: 10,
          });
        }
      }
    }
    return;
  }
};

export const rmbMenuActions = (iconName: string, clickedSat: any) => {
  const { uiManager, objectManager } = keepTrackApi.programs;
  if (iconName === 'edit-sat-rmb') {
    objectManager.setSelectedSat(clickedSat);
    if (!isEditSatMenuOpen) {
      uiManager.bottomIconPress({
        currentTarget: { id: 'menu-editSat' },
      });
    }
    return;
  }
};

export const hideSideMenus = () => {
  $('#editSat-menu').effect('slide', { direction: 'left', mode: 'hide' }, 1000);
  $('#menu-editSat').removeClass('bmenu-item-selected');
  isEditSatMenuOpen = false;
};

export const editSatNewTleClick = () => {
  $('#loading-screen').fadeIn(1000, editSatNewTleClickFadeIn);
};

export const editSatNewTleClickFadeIn = () => {
  const { satellite, satSet, timeManager, objectManager, orbitManager, uiManager } = keepTrackApi.programs;
  try {
    // Update Satellite TLE so that Epoch is Now but ECI position is very very close
    const satId = satSet.getIdFromObjNum($('#es-scc').val());
    const mainsat = satSet.getSat(satId);

    // Launch Points are the Satellites Current Location
    const TEARR = mainsat.getTEARR();
    let launchLat, launchLon, alt;
    launchLon = satellite.degreesLong(TEARR.lon);
    launchLat = satellite.degreesLat(TEARR.lat);
    alt = TEARR.alt;

    const upOrDown = mainsat.getDirection();

    const simulationTimeObj = timeManager.simulationTimeObj;

    const currentEpoch = satellite.currentEpoch(simulationTimeObj);
    mainsat.TLE1 = mainsat.TLE1.substr(0, 18) + currentEpoch[0] + currentEpoch[1] + mainsat.TLE1.substr(32);

    keepTrackApi.programs.mainCamera.isCamSnapMode = false;

    let TLEs;
    // Ignore argument of perigee for round orbits OPTIMIZE
    if (mainsat.apogee - mainsat.perigee < 300) {
      TLEs = satellite.getOrbitByLatLon(mainsat, launchLat, launchLon, upOrDown, simulationTimeObj);
    } else {
      TLEs = satellite.getOrbitByLatLon(mainsat, launchLat, launchLon, upOrDown, simulationTimeObj, alt);
    }

    const TLE1 = TLEs[0];
    const TLE2 = TLEs[1];

    if (TLE1 === 'Error') {
      $('#loading-screen').fadeOut('slow');
      uiManager.toast(`${TLE2}`, 'critical');
      return;
    }

    satSet.satCruncher.postMessage({
      typ: 'satEdit',
      id: satId,
      TLE1: TLE1,
      TLE2: TLE2,
    });
    orbitManager.updateOrbitBuffer(satId, true, TLE1, TLE2);
    //
    // Reload Menu with new TLE
    //
    const sat = satSet.getSatExtraOnly(objectManager.selectedSat);
    $('#es-scc').val(sat.sccNum);

    let inc: string | string[] = (sat.inclination * RAD2DEG).toPrecision(7);
    inc = inc.split('.');
    inc[0] = inc[0].substr(-3, 3);
    inc[1] = inc[1].substr(0, 4);
    inc = (inc[0] + '.' + inc[1]).toString();

    $('#es-inc').val(stringPad.pad0(inc, 8));
    $('#es-year').val(sat.TLE1.substr(18, 2));
    $('#es-day').val(sat.TLE1.substr(20, 12));
    $('#es-meanmo').val(sat.TLE2.substr(52, 11));

    let rasc: string | string[] = (sat.raan * RAD2DEG).toPrecision(7);
    rasc = rasc.split('.');
    rasc[0] = rasc[0].substr(-3, 3);
    rasc[1] = rasc[1].substr(0, 4);
    rasc = (rasc[0] + '.' + rasc[1]).toString();

    $('#es-rasc').val(stringPad.pad0(rasc, 8));
    $('#es-ecen').val(sat.eccentricity.toPrecision(7).substr(2, 7));

    let argPe: string | string[] = (sat.argPe * RAD2DEG).toPrecision(7);
    argPe = argPe.split('.');
    argPe[0] = argPe[0].substr(-3, 3);
    argPe[1] = argPe[1].substr(0, 4);
    argPe = (argPe[0] + '.' + argPe[1]).toString();

    $('#es-argPe').val(stringPad.pad0(argPe, 8));
    $('#es-meana').val(sat.TLE2.substr(44 - 1, 7 + 1));
  } catch (error) {
    console.debug(error);
  }
  $('#loading-screen').fadeOut('slow');
};

export const editSatSubmit = (e: Event) => {
  const { satellite, satSet, timeManager, orbitManager } = keepTrackApi.programs;
  $('#es-error').hide();
  const scc = $('#es-scc').val();
  const satId = satSet.getIdFromObjNum(scc);
  if (satId === null) {
    console.log('Not a Real Satellite');
    e.preventDefault();
    return false;
  }
  const sat = satSet.getSatExtraOnly(satId);
  const intl = sat.TLE1.substr(9, 8);
  let inc = <StringifiedNubmer>$('#es-inc').val();
  let meanmo = <StringifiedNubmer>$('#es-meanmo').val();
  let rasc = <StringifiedNubmer>$('#es-rasc').val();
  const ecen = $('#es-ecen').val();
  let argPe = <StringifiedNubmer>$('#es-argPe').val();
  let meana = <StringifiedNubmer>$('#es-meana').val();
  const epochyr = $('#es-year').val();
  const epochday = $('#es-day').val();

  const { TLE1, TLE2 } = satellite.createTle({ sat, inc, meanmo, rasc, argPe, meana, ecen, epochyr, epochday, intl, scc });

  if (satellite.altitudeCheck(TLE1, TLE2, timeManager.simulationTimeObj) > 1) {
    satSet.satCruncher.postMessage({
      typ: 'satEdit',
      id: satId,
      active: true,
      TLE1: TLE1,
      TLE2: TLE2,
    });
    orbitManager.updateOrbitBuffer(satId, true, TLE1, TLE2);
    sat.active = true;
  } else {
    $('#es-error').html('Failed Altitude Check</br>Try Different Parameters');
    $('#es-error').show();
  }
  e.preventDefault();
  return true;
};

export const editSatSaveClick = (e: Event) => {
  const { satSet } = keepTrackApi.programs;
  try {
    const scc = $('#es-scc').val();
    const satId = satSet.getIdFromObjNum(scc);
    const sat = satSet.getSatExtraOnly(satId);
    const sat2 = {
      TLE1: sat.TLE1,
      TLE2: sat.TLE2,
    };
    const variable = JSON.stringify(sat2);
    const blob = new Blob([variable], {
      type: 'text/plain;charset=utf-8',
    });
    saveAs(blob, scc + '.tle');
  } catch (error) {
    // intentionally left blank
  }
  e.preventDefault();
};
