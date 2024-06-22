import daynight from 'daynight'

const date = new Date()
const result = daynight()
const infoBlock = document.getElementById('info')!
const mapBlock = document.getElementById('map')!

const infoHtml = [
  `It's ${date.toLocaleTimeString()} in <b>${result.timezone}</b>.`,
  "I think it's " + (result.light ? '😎 <b>light</b>' : '🌚 <b>dark</b>') + ' there.',
  'The brightness is ' + (result.brightness * 10).toFixed(2) + '/10.',
].join('<br/>')

infoBlock.innerHTML = infoHtml

const coordinates = result.coordinates.join(',')
const mapHtml =
  '<img src="https://static-maps.yandex.ru/1.x/?ll=' +
  coordinates +
  '&amp;size=275,275&amp;z=2&amp;l=sat,skl&amp;pt=' +
  coordinates +
  ',round&amp;lang=en" />'

mapBlock.innerHTML = mapHtml
