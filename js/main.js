//console.log("hello world!");
$(document).ready(function() {

// Toggle code to make popups remain when marker is clicked
// 	L.Map = L.Map.extend({
//    			openPopup: function(popup) {
// 					this.closePopup();  // just comment this
//        		 		this._popup = popup;
// 
//         			return this.addLayer(popup).fire('popupopen', {
//             				popup: this._popup
//        				});
//   			  }
//   	});

	var countries;
	var map = L.map('map', {
		center: [15.2930, 20], //50.8476
		zoom: 4,
		minZoom: 2,
		maxZoom: 13
	});
	
	L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}@2x.png?access_token={accessToken}', {
		attribution: '&copy <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
		id: 'openair.15f9628f',
		accessToken: 'pk.eyJ1Ijoib3BlbmFpciIsImEiOiJjaWxheGcxdzIwZGxydHlsenJpOXJ5azZxIn0.uZ-GuqO9YrQ6HIbMH6cX9w'
	}).addTo(map);
	
	// geojson converted using http://www.convertcsv.com/csv-to-geojson.htm
	$.getJSON('data/countries.geojson')
			.done(function(data) {
//					console.log(data);
					var info = processData(data);
					createPropSymbols(info.timestamps, data);
					createLegend(info.min,info.max);
					createSliderUI(info.timestamps);
			})
	.fail(function() { alert("There has been a problem loading the data.")});	
	
	function processData(data) {
			var timestamps = [];
			var min = Infinity;
			var max = -Infinity;
			
			for (var feature in data.features) {
				
				var properties = data.features[feature].properties;
				
				for (var attribute in properties) {
				
					if ( attribute != 'id' &&
						attribute != 'name' &&
						attribute != 'lat' &&
						attribute != 'lon' ) {
						
							if ( $.inArray(attribute,timestamps) === -1) {
									timestamps.push(attribute);
							}
							
							if (properties[attribute] < min) {
									min = properties[attribute];
							}
							
							if (properties[attribute] > max) {
									max = properties[attribute];
							}
					}
				}
			}
			
			return {
					timestamps : timestamps,
					min : min,
					max : max
			}
				
	} //end processData()
	
	function createPropSymbols(timestamps, data) {
	
			countries = L.geoJson(data, {
			
						pointToLayer: function(feature, latlng) {
						
						return L.circleMarker(latlng, {
								fillColor: '#5fae41',
								color: '#38483D',//'#519437',
								weight: 1,
								fillOpacity: 0.6
								}).on({
									
										mouseover: function(e) {
												this.openPopup();
												this.setStyle({color: '#ed1c24'});
										},
										mouseout: function(e) {
												this.closePopup();
												this.setStyle({color: '#38483D'}); //'#519437'
										}
								});

						}
			}).addTo(map);
			
			updatePropSymbols(timestamps[0]);
			
	}	//end createPropSymbols()

	function updatePropSymbols(timestamps) {
	
			countries.eachLayer(function(layer) {
			
						var props = layer.feature.properties;
						var radius = calcPropRadius(props[timestamps]);
						var popupContent = "<b>" + String (props[timestamps]) +
										" treaties signed</b><br>" + 
										"<i>" + props.country +
										"</i> in </i>" +
										timestamps + "</i>";
						
						layer.setRadius(radius);
						layer.bindPopup(popupContent, { offset: new L.Point(0, -radius)});
			});
	} //end updatePropSymbols()
	
	function calcPropRadius(attributeValue) {
			
			var scaleFactor = 200; //changes relative size of circles
			var area = attributeValue * scaleFactor;
			return Math.sqrt(area/Math.PI)*2;
	} // end calcPropRadius()
	
	function createLegend(min, max) {
	
			if (min < 10) {
					min = 10;
			}
	
			function roundNumber(inNumber) {
					
							return (Math.round(inNumber/5) * 5);
			} //end roundNumber, function rounds value to the nearest increment of 10
			
			var legend = L.control( { position: 'bottomright' } );
			
			legend.onAdd = function(map) {
			
			var legendContainer = L.DomUtil.create('div', 'legend');
			var symbolsContainer = L.DomUtil.create('div', 'symbolsContainer');
			var classes = [6, 3, 1]//[roundNumber(min), roundNumber((min-max)/2) ,roundNumber(max)];
			var legendCircle;
			var lastRadius = 0;
			var currentRadius;
			var margin;
			
			L.DomEvent.addListener(legendContainer, 'mousedown', function(e){
					L.DomEvent.stopPropagation(e);
			})
			
			$(legendContainer).append("<h2 id='legendTitle'># of treaties signed</h2>");
			
			for (var i = 0; i<= classes.length-1; i++) {
			
					legendCircle = L.DomUtil.create('div', 'legendCircle');
					
					currentRadius = calcPropRadius(classes[i]);
					
					margin = -currentRadius - lastRadius - 2;
					
					$(legendCircle).attr('style', 'width: '+ currentRadius*2 +
							'px; height: ' + currentRadius*2 +
							'px; margin-left: ' + margin + 'px' ); //may need to be ".."
					$(legendCircle).append("<span class='legendValue'>" + classes[i] + "</span>");		
					
					$(symbolsContainer).append(legendCircle);
					
					lastRadius = currentRadius;		
			}
			
			$(legendContainer).append(symbolsContainer);
			
			return legendContainer;
			
			}; //end for loop
			
			legend.addTo(map);
			
	} //end createLegend()
	
	function createSliderUI(timestamps) {
	
			var sliderControl = L.control({ position: 'bottomleft' } ); //creates variable sliderControl and sets a leaflet control inside
			
			sliderControl.onAdd = function(map) { //adds the sliderControl to the map. 

					var slider = L.DomUtil.create("input", "range-slider"); // creates variable slider and places inside a DOM element with tagName, className

					if (!L.Browser.touch) {
	 				L.DomEvent.addListener(slider, 'mousedown', function(e) {
						L.DomEvent.stopPropagation(e);
					}); 
					} else {
						L.DomEvent.on(slider, 'touchstart', L.DomEvent.stopPropagation);
					}
					
					
				
					$(slider)
							.attr({'type':'range',
									'max': timestamps[2],//[timestamps.length-1], 
									'min': timestamps[0],
									'value': String(timestamps[0]),
									'step': 10}) //possible change this to 10
							.on('input change', function() {
							updatePropSymbols($(this).val().toString() );
								$('.temporal-legend').text(this.value);	
					});									
					return slider;
			} //end function(map)
			
		sliderControl.addTo(map)
		
			createTemporalLegend(timestamps[0]);
			
			
			
	} //end createSliderUI()
	
	function createTemporalLegend(startTimestamp) {
	
			var temporalLegend = L.control( { position: 'bottomleft'} );
			
			temporalLegend.onAdd = function(map) {
					var output = L.DomUtil.create("output", "temporal-legend");
					$(output).text(startTimestamp);
					return output;
					
			} //end function(map)
			
			temporalLegend.addTo(map);
			$(".temporal-legend").text(startTimestamp);
	} // end createTemporalLegend()
	
	
});	