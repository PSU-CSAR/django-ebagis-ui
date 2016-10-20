var aoi_names;
var geojson_layer; 
var tokenval = '72fea6de347c5dda7a79daa74ed386642e03236e';
var sortState = "ascending";


// initialize the map
var map = L.map('map').setView([40, -99], 4);

// from http://stackoverflow.com/questions/8996963/how-to-perform-case-insensitive-sorting-in-javascript
function insensitive(s1, s2) {
    var s1lower = s1.toLowerCase();
    var s2lower = s2.toLowerCase();
    return s1lower > s2lower? 1 : (s1lower < s2lower? -1 : 0);
}

function addFeatureRows() {
    if (sortState === 'ascending') {
      aoi_names.sort(insensitive);
    } else if (sortState === 'descending') {
      (aoi_names.sort(insensitive)).reverse();
    }
    $("#feature-list tbody").empty();
    for (var i in aoi_names) {
        var toAdd = '<tr class="feature-row" value="' + aoi_names[i] + '"><td style="vertical-align: middle;"><img width="16px" height="18px" src="water.png"></td><td class="feature-name">' + aoi_names[i] + '</td><td style="vertical-align: middle;"</td></tr>'
        $("#feature-list tbody").append(toAdd);
    }
}

function formatJSON(obj, currKey) {
    var content =  "<div id=\"bar_content\">";
    function recurse(obj, indent) {
      var content2 = '';
      if (obj) {
          for (var key in obj) {   
            if (typeof obj[key] === "object") {
              var value;
              if(obj[key] === null || obj[key] === "")
                value = "none";
              else
                value = '';
              //console.log('key: ' + key + ' is of type ' + typeof key + '\n' + 'obj: ' + obj + '\n' + 'obj[key] ' + obj[key]);
              content2 += "<div>" + String.fromCharCode(160).repeat(indent) + key + ':  ' + value  + "</div>";
              content2 += recurse(obj[key], indent += 4);  
            } else if (typeof obj[key] !== "function") {
                var value;
                //console.log('key: ' + key + ' is of type ' + typeof key + '\n' + 'obj: ' + obj + '\n' + 'obj[key] ' + obj[key]);
                if ((typeof obj[key] === 'Array' && obj[key].length === 0) || obj[key] === "" || obj[key] === null) {
                  value = "none";
                } else {
                  value = obj[key];
                }
                content2 += "<div>" + String.fromCharCode(160).repeat(indent) + key + ':  ' + value +  "</div>";
            }
          }
      }
      return content2;
    }
    content += recurse(obj, 0);
    return content + "</div>";
} 

// add control layer
var controlBar = L.control.bar('bar', {
    position: 'bottom',
    visible: false,
});
map.addControl(controlBar);

// load a tile layer
var baselayer = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
{
    attribution: 'Tiles by <a href="http://mapc.org">MAPC</a>',
}).addTo(map);

var defaultStyle = {
    "color": "#b20000",
    "weight": 0,
    "fillOpacity": .75
};

var highlightStyle = {
    "fillColor": "#0000b2",
    "fillOpacity": "8",
};

// request for the aoi names
jQuery.ajax({
  'type': 'GET',
  'url': 'https://test.ebagis.geog.pdx.edu/api/rest/aois/?format=geojson',
  'datatype': 'json',
  'headers':  {'Authorization': 'Token ' + tokenval},
  'success': function(data) { 
    aoi_names = new Array();
    geojson_layer = L.geoJson(data, {
        onEachFeature: function(feature,layer){
          layer.bindPopup(feature.properties.name);
        },
        style: defaultStyle
    }).addTo(map);
    //console.log(geojson_layer.getBounds());
    map.fitBounds(geojson_layer.getBounds(), {"animate":true});
    L.control.scale().addTo(map);
    // console.log(data.features); 
  }
});


$(document).on("click", ".feature-row", function(event){
  var value = this.getAttribute('value'); 
  var aoiname = ' ';
  geojson_layer.eachLayer(function (layer) {  
      //console.log('this.value ' + value);
      if(layer.feature.properties.name == value) { 
      //console.log('if: ' + layer.feature.properties.name); 
          layer.setStyle(highlightStyle) 
      layer.bringToFront();
      //console.log(layer.feature.properties);
      aoiname = layer.feature.properties.url;
      aoiname = aoiname.substring(0, aoiname.indexOf('?'));
      //console.log(aoiname);
      map.fitBounds(layer.getBounds(), {
          "maxZoom": 9,
          "animate": true,
      });
      } else {
          geojson_layer.resetStyle(layer);
          controlBar.hide();
      } 
  });

  // request for the detailed view data
  jQuery.ajax({
    'type': 'GET',
    'url': aoiname,
    'datatype': 'json',
    'headers':  {'Authorization': 'Token ' + tokenval},
    'success': function(data) { 
      //console.log(data);
      controlBar.setContent(formatJSON(data));
     // console.log(r(data));
     setTimeout(function(){ controlBar.show() }, 500); 
    }
  });
});

map.on('moveend', function(event){
    aoi_names = new Array();
    $("#feature-list tbody").empty();
    geojson_layer.eachLayer(function (layer) {      
      if (map.getBounds().intersects(layer.getLatLngs())) {
       aoi_names.push(layer.feature.properties.name);
      }
    });
    addFeatureRows(); 
});

$('#sort-btn').on('click', function(event){
    sortState = 'descending';
    addFeatureRows();
    $('.panel-body').empty();
    $('.panel-body').append('<div class="row"><input type="text" class="form-control search" placeholder="Filter" /><button type="button" class="btn sort asc" data-sort="feature-name" id="sort-btndesc"><i class="fa fa-sort-alpha-desc" aria-hidden="true"></i> Sort</button></div>');
});

$(document).on('click', '#sort-btndesc', function(){
    sortState = 'ascending';
    addFeatureRows();
    $('.panel-body').empty();
    $('.panel-body').append('<div class="row"><input type="text" class="form-control search" placeholder="Filter" /><button type="button" class="btn sort" data-sort="feature-name" id="sort-btnasc"><i class="fa fa-sort-alpha-asc" aria-hidden="true"></i> Sort</button></div>');
});

$(document).on('click', '#sort-btnasc', function(){
    sortState = 'descending';
    addFeatureRows();
    $('.panel-body').empty();
    $('.panel-body').append('<div class="row"><input type="text" class="form-control search" placeholder="Filter" /><button type="button" class="btn sort" data-sort="feature-name" id="sort-btndesc"><i class="fa fa-sort-alpha-desc" aria-hidden="true"></i> Sort</button></div>');
});

