import { keepTrackApi } from '../api/externalApi';
import { timeManager } from '@app/js/timeManager/timeManager.ts';

test(`Basic Functions of Time Manager`, () => {
  // Setup a unit test enviornment that doesn't worry about other modules
  document.body.innerHTML = `
    <div id="datetime-text"><div>
  `;

  keepTrackApi.programs.settingsManager = { plugins: {} };
  timeManager.init();
  expect(timeManager.timeTextStr).toBe('');
  expect(timeManager.drawDt).toBe(0);

  document.getElementById('datetime-text').innerText = timeManager.timeTextStr;
  timeManager.setSelectedDate(new Date());

  timeManager.setLastTime(new Date());
  timeManager.setSelectedDate(new Date());

  timeManager.propTime(new Date());

  timeManager.propTime(null);

  timeManager.setPropRateZero();
  timeManager.propTime();

  timeManager.propTime();

  timeManager.changePropRate(1);
  timeManager.propTime();

  timeManager.propTimeCheck();

  timeManager.getPropOffset();

  timeManager.dateToLocalInIso(new Date());

  timeManager.localToZulu(new Date());

  timeManager.getDayOfYear(new Date());

  timeManager.getDayOfYear();

  timeManager.getDayOfYear(new Date(2020, 2, 1));

  timeManager.dateFromJday(2021, 10);

  timeManager.jday(2021, 3, 15, 12, 0, 0);

  timeManager.jday(null, 3, 15, 12, 0, 0);

  timeManager.setNow(new Date(), 60);

  timeManager.setSelectedDate(null);
  timeManager.getPropOffset();
});
