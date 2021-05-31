var day = daynight.default()
var date = new Date()
var infoBlock = document.getElementById('info')
var mapBlock = document.getElementById('map')
var codeBlock = document.getElementById('code')

if (day.error) {
  document.body.innerHTML = '<h1>An error occurred: ' + day.error.message + '</h1>'
}

var infoHtml =
  '<ul><li>' +
  [
    "You're in <b>" + day.timezone + '</b>',
    'Current date is ' + date.toLocaleDateString() + ' ' + date.toLocaleTimeString() + '.',
    "I think it's " + (day.light ? '😎 <b>light</b>' : '🌚 <b>dark</b>') + ' there.',
    'The brightness is ' + Math.round(day.brightness * 100) + '%',
  ].join('</li><li>') +
  '</li></ul>'

infoBlock.innerHTML = infoHtml

var coordinates = day.coordinates.join(',')
var mapHtml =
  '<img src="https://static-maps.yandex.ru/1.x/?ll=' +
  coordinates +
  '&amp;size=450,275&amp;z=1&amp;l=sat,skl&amp;pt=' +
  coordinates +
  ',round&amp;lang=en" class="map" alt="map" />'

mapBlock.innerHTML = mapHtml

var codeText = JSON.stringify(day, null, 2)
codeBlock.innerText = codeText
