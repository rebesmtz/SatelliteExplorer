let map = null;
let marker = null;
let isochrone = null;
let outputAreas = null;
let outputAreaCentroids = null;
let censusFeatures = null;

let isIsochroneVisible = true;
let areOutputAreasVisible = true;

let selectedOAList = ''; // Declare this at the top of your script, outside any function


const supergroupColors = {
  "Multicultural Metropolitans": "#E9730C",
  "Ethnicity Central": "#F755C9",
  "Constrained City Dwellers": "#F5D423",
  "Hard-Pressed Living": "#786EB6",
  "Cosmopolitans": "#1C76FD",
  "Urbanites": "#FF5C67",
  "Suburbanites": "#8BB340",
  "Rural Residents": "#42E8E0"
};

// Load data
loadCensusFeatures();
loadOutputAreaCentroids();


document.getElementById('isochrone-type').addEventListener('change', updateIsochroneUnit);

function updateIsochroneUnit() {
    const isochroneType = document.getElementById('isochrone-type').value;
    const isochroneUnit = document.getElementById('isochrone-unit');
    isochroneUnit.textContent = isochroneType === 'time' ? 'minutes' : 'miles';
}

// Replace the existing toggle functions with these:
function toggleIsochrone() {
  isIsochroneVisible = document.getElementById('isochrone-toggle').checked;
  if (map.getLayer('isochrone')) {
      map.setLayoutProperty('isochrone', 'visibility', isIsochroneVisible ? 'visible' : 'none');
  }
}

function toggleOutputAreas() {
  areOutputAreasVisible = document.getElementById('output-areas-toggle').checked;
  if (map.getLayer('output-areas')) {
      map.setLayoutProperty('output-areas', 'visibility', areOutputAreasVisible ? 'visible' : 'none');
  }
}

// Add these event listeners after the map is initialized
document.getElementById('isochrone-toggle').addEventListener('change', toggleIsochrone);
document.getElementById('output-areas-toggle').addEventListener('change', toggleOutputAreas);



// ... (keep all existing code at the beginning of the file unchanged) ...

document.getElementById('update-map').addEventListener('click', () => {
  const apiKey = document.getElementById('mapbox-api-key').value;
  
  if (apiKey) {
      mapboxgl.accessToken = apiKey;
      
      if (!map) {
          try {
              map = new mapboxgl.Map({
                  container: 'map',
                  style: 'mapbox://styles/mapbox/dark-v11', // Keep this as the default style
                  center: [-0.118092, 51.509865], // Central London
                  zoom: 10 // Initial zoom level
              });
              
              map.on('load', () => {
                  console.log('Map loaded successfully');
                  map.on('click', onMapClick);

                  // Add this new event listener for map style change
                  document.getElementById('map-style').addEventListener('change', (e) => {
                      const newStyle = e.target.value;
                      map.setStyle(newStyle);
                      
                      // Ensure layers are re-added after style change
                      map.once('style.load', () => {
                          if (isochrone) {
                              addIsochroneToMap(isochrone);
                          }
                          if (outputAreas) {
                              updateOutputAreas();
                          }
                      });
                  });
              });

              map.on('error', (e) => {
                  console.error('Map error:', e);
                  alert('An error occurred while loading the map. Please check your API key and try again.');
              });
          } catch (error) {
              console.error('Error initializing map:', error);
              alert('Failed to initialize the map. Please check your API key and try again.');
              return;
          }
      }
      
      if (marker) {
          const lngLat = marker.getLngLat();
          updateIsochrone(lngLat);
      } else {
          alert('Please click on the map to place a marker and see catchments.');
      }
  } else {
      alert('Please enter a valid Mapbox API key.');
  }
});



const searchInput = document.getElementById('search-input');


// Modify the existing event listener for the search button - remove the button listener and make it key enter press

searchInput.addEventListener('keypress', function(event) {
  if (event.key === 'Enter') {
      event.preventDefault(); // Prevent form submission if within a form
      const query = this.value;
      if (query.trim() !== '') {
          geocodeQuery(query);
          searchSuggestions.style.display = 'none';
      }
  }
});


// Hide suggestions when clicking outside
document.addEventListener('click', function(event) {
  if (!searchInput.contains(event.target) && !searchSuggestions.contains(event.target)) {
      searchSuggestions.style.display = 'none';
  }
});

// ... (rest of the existing code) ...







// ... (existing code) ...


const searchSuggestions = document.getElementById('search-suggestions');

let debounceTimer;

searchInput.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const query = this.value;
        if (query.length > 2) {
            fetchSuggestions(query);
        } else {
            searchSuggestions.style.display = 'none';
        }
    }, 300);
});

// the below needs changing to add postcodes and icons: chaging fetchsuggestions, and displaysuggestions
// changing again to add POIs

function fetchSuggestions(query) {
  const apiKey = document.getElementById('mapbox-api-key').value;
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${apiKey}&country=GB&types=place,locality,neighborhood,postcode,poi`;

  fetch(url)
      .then(response => response.json())
      .then(data => {
          displaySuggestions(data.features);
      })
      .catch(error => {
          console.error('Error fetching suggestions:', error);
      });
}

// changing icons slightly to see why restaurants arent appearing

function getIconForType(type, properties) {
  console.log('Type:', type, 'Properties:', properties); // Debugging log

  switch(type) {
      case 'place':
          return '🏙️'; // City icon
      case 'locality':
          return '🏘️'; // Town icon
      case 'neighborhood':
          return '🏡'; // Neighborhood icon
      case 'postcode':
          return '📮'; // Postcode icon
      case 'poi':
          // For POIs, we'll check multiple properties
          if (properties.category) {
              switch(properties.category) {
                  case 'airport':
                      return '✈️'; // Airport icon
                  case 'shopping_mall':
                  case 'shopping':
                      return '🛍️'; // Shopping mall icon
                  case 'landmark':
                  case 'monument':
                      return '🏛️'; // Landmark icon
                  case 'park':
                  case 'garden':
                      return '🏞️'; // Park icon
                  case 'restaurant':
                  case 'food':
                      return '🍽️'; // Restaurant icon
              }
          }
          // Check Mapbox's maki property for more specific icons
          if (properties.maki) {
              switch(properties.maki) {
                  case 'restaurant':
                  case 'food':
                      return '🍽️'; // Restaurant icon
                  case 'shop':
                      return '🛍️'; // Shopping icon
                  case 'park':
                      return '🏞️'; // Park icon
                  case 'museum':
                  case 'monument':
                      return '🏛️'; // Museum/monument icon
                  // Add more cases as needed
              }
          }
          return '🏢'; // Default building icon for other POIs
      default:
          return '📍'; // Default pin icon
  }
}

function displaySuggestions(suggestions) {
  searchSuggestions.innerHTML = '';
  if (suggestions.length > 0) {
      suggestions.forEach(suggestion => {
          console.log('Suggestion:', suggestion); // Debugging log

          const div = document.createElement('div');
          div.classList.add('suggestion-item');
          
          const icon = document.createElement('span');
          icon.classList.add('suggestion-icon');
          // We now pass the entire properties object
          icon.textContent = getIconForType(suggestion.place_type[0], suggestion.properties);
          
          const text = document.createElement('span');
          text.classList.add('suggestion-text');
          text.textContent = suggestion.place_name;
          
          div.appendChild(icon);
          div.appendChild(text);
          
          div.addEventListener('click', () => {
              searchInput.value = suggestion.place_name;
              searchSuggestions.style.display = 'none';
              geocodeQuery(suggestion.place_name);
          });
          searchSuggestions.appendChild(div);
      });
      searchSuggestions.style.display = 'block';
  } else {
      searchSuggestions.style.display = 'none';
  }
}


// start of the geocodeQuery

// Modify the existing geocodeQuery function
function geocodeQuery(query) {
  const apiKey = document.getElementById('mapbox-api-key').value;
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${apiKey}`;

  fetch(url)
      .then(response => response.json())
      .then(data => {
          if (data.features.length > 0) {
              const firstResult = data.features[0];
              const lngLat = {
                  lng: firstResult.center[0],
                  lat: firstResult.center[1]
              };
              map.flyTo({
                  center: lngLat,
                  zoom: 12
              });
              if (marker) {
                  marker.remove();
              }
              marker = new mapboxgl.Marker().setLngLat(lngLat).addTo(map);
              updateIsochrone(lngLat);
          } else {
              alert('No results found.');
          }
      })
      .catch(error => {
          console.error('Error:', error);
          alert('An error occurred while geocoding.');
      });
}

// end of modified geocodequery function
// this is what needs modifying with the new files that are loaded


function loadCensusFeatures() {
  Promise.all([
    fetch('first_part.csv').then(response => response.text()),
    fetch('second_part.csv').then(response => response.text()),
    fetch('third_part.csv').then(response => response.text())
  ])
  .then(([data1, data2, data3]) => {
    const combinedData = data1 + '\n' + 
      data2.split('\n').slice(1).join('\n') + '\n' + 
      data3.split('\n').slice(1).join('\n');
    const features = [];
    // Normalize line endings and then split into lines
    const lines = combinedData.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const headers = lines[0].split(',');
    lines.slice(1).forEach(line => {
      if (line.trim() === '') return; // Skip empty lines
      const values = line.split(',');
      const properties = {};
      headers.forEach((header, index) => {
        let value = values[index];
        if (header === 'geography') {
          // Remove escape characters and double quotes from the geography column
          value = value.replace(/\\"/g, '');
        }
        properties[header] = value;
      });
      features.push(properties);
    });
    censusFeatures = features;
    console.log('Census Features Sample:', censusFeatures.slice(0, 5));
  })
  .catch(error => logError(error, 'Error loading census features.'));
}


function logError(error, message) {
    console.error(message, error);
    alert(message);
}

function onMapClick(event) {
    const lngLat = event.lngLat;

    if (marker) {
        marker.remove();
    }

    marker = new mapboxgl.Marker().setLngLat(lngLat).addTo(map);

    updateIsochrone(lngLat);
}

function updateIsochrone(lngLat) {
  const apiKey = document.getElementById('mapbox-api-key').value;
  const isochroneType = document.getElementById('isochrone-type').value;
  const isochroneValue = parseFloat(document.getElementById('isochrone-value').value);

  if (isochroneType === 'time') {
      // Time-based isochrone using Mapbox API
      const url = `https://api.mapbox.com/isochrone/v1/mapbox/driving/${lngLat.lng},${lngLat.lat}?contours_minutes=${isochroneValue}&polygons=true&access_token=${apiKey}`;

      fetch(url)
          .then(response => {
              if (!response.ok) {
                  throw new Error('Failed to fetch isochrone data');
              }
              return response.json();
          })
          .then(data => {
              if (data.features.length === 0) {
                  throw new Error('No isochrone data returned');
              }
              addIsochroneToMap(data);
          })
          .catch(error => {
              console.error('Error fetching or processing isochrone data:', error);
              alert('Error fetching or processing isochrone data. Please try again.');
          });
  } else {
      // Distance-based isochrone using Turf.js
      const radius = isochroneValue * 1609.34; // Convert miles to meters
      const options = {steps: 64, units: 'meters'};
      const circle = turf.circle([lngLat.lng, lngLat.lat], radius, options);
      
      const circleFeatureCollection = {
          type: 'FeatureCollection',
          features: [circle]
      };

      addIsochroneToMap(circleFeatureCollection);
  }
}

function addIsochroneToMap(data) {
  try {
    isochrone = data;
    if (map.getLayer('isochrone')) {
        map.removeLayer('isochrone');
        map.removeSource('isochrone');
    }
    map.addLayer({
        id: 'isochrone',
        type: 'fill',
        source: {
            type: 'geojson',
            data: data
        },
        paint: {
            'fill-color': '#00766f',
            'fill-opacity': 0.5
        },
        layout: {
            visibility: isIsochroneVisible ? 'visible' : 'none'
        }
    });
    const bounds = turf.bbox(data);
    map.fitBounds(bounds, { padding: 50 });
    updateOutputAreas();
  } catch (error) {
    console.error('Error adding isochrone to map:', error);
    alert('Error adding isochrone to map. Please try again.');
  }
}
proj4.defs("EPSG:27700", "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs");

function loadOutputAreaCentroids() {
    fetch('oapwc.csv')
        .then(response => response.text())
        .then(data => {
            const features = [];
            const lines = data.split('\n');
            lines.slice(1).forEach(line => {
                const [FID, OA21CD, GlobalID, x, y] = line.split(',');
                const xCoord = parseFloat(x);
                const yCoord = parseFloat(y);
                
                if (!isNaN(xCoord) && !isNaN(yCoord)) {
                    const [lng, lat] = proj4('EPSG:27700', 'EPSG:4326', [xCoord, yCoord]);
                    features.push({
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [lng, lat]
                        },
                        properties: {
                            FID,
                            OA21CD,
                            GlobalID
                        }
                    });
                } else {
                    console.warn(`Invalid coordinates for FID: ${FID}, OA21CD: ${OA21CD}`);
                }
            });
            outputAreaCentroids = {
                type: 'FeatureCollection',
                features
            };
            console.log('Output Area Centroids Sample:', outputAreaCentroids.features.slice(0, 5));
        })
        .catch(error => logError(error, 'Error loading output area centroids.'));
}

// Add this at the top of your script, outside of any function
let currentPopup = null;

function updateOutputAreas() {
  if (!isochrone || !outputAreaCentroids || !censusFeatures) {
      console.log('Missing data:', { isochrone: !!isochrone, outputAreaCentroids: !!outputAreaCentroids, censusFeatures: !!censusFeatures });
      return;
  }

  try {
      const intersectingCentroids = turf.pointsWithinPolygon(outputAreaCentroids, isochrone);
      outputAreas = intersectingCentroids;
      const intersectingOACodes = intersectingCentroids.features.map(feature => feature.properties.OA21CD);

      console.log('Intersecting OA Codes Sample:', intersectingOACodes.slice(0, 5));

      // Create a mapping of OA codes to Supergroup Names, Group Names, and Subgroup Names
      const oaInfoMap = {};
      censusFeatures.forEach(feature => {
          if (intersectingOACodes.includes(feature.geography)) {
              oaInfoMap[feature.geography] = {
                  supergroupName: feature['Supergroup Name'],
                  groupName: feature['Group Name'],
                  subgroupName: feature['Subgroup Name']
              };
          }
      });

      console.log('OA Info Map Sample:', Object.entries(oaInfoMap).slice(0, 5));

      // Get unique Supergroup Names
      const uniqueSupergroups = [...new Set(Object.values(oaInfoMap).map(info => info.supergroupName))];
      console.log('Unique Supergroups:', uniqueSupergroups);

      // Create a color scale for the unique Supergroup Names
      const colorScale = d3.scaleOrdinal()
      .domain(Object.keys(supergroupColors))
      .range(Object.values(supergroupColors));

      const layerConfig = {
          id: 'output-areas',
          type: 'fill',
          source: {
              type: 'vector',
              url: 'mapbox://tahmed.67lv0km2'
          },
          'source-layer': 'Output_Areas_Dec_2021_Boundar-dp2i2i',
          paint: {
              'fill-opacity': 0.5
          },
          layout: {
              visibility: areOutputAreasVisible ? 'visible' : 'none'
          },
          filter: ['in', 'OA21CD', ...intersectingOACodes]
      };

      // Remove existing layer and source if they exist
      if (map.getLayer('output-areas')) {
          map.removeLayer('output-areas');
      }
      if (map.getSource('output-areas')) {
          map.removeSource('output-areas');
      }

      // Find the first symbol layer in the map style
      let firstSymbolId;
      for (const layer of map.getStyle().layers) {
          if (layer.type === 'symbol') {
              firstSymbolId = layer.id;
              break;
          }
      }

      // Add new layer just before the first symbol layer
      map.addLayer(layerConfig, firstSymbolId);

      // Prepare color expressions for Mapbox GL JS
      const colorMatchExpression = ['match', ['get', 'OA21CD']];
      Object.entries(oaInfoMap).forEach(([code, info]) => {
          colorMatchExpression.push(code, colorScale(info.supergroupName));
      });
      colorMatchExpression.push('#ccc'); // Default color for non-matching areas

      console.log('Color Match Expression:', JSON.stringify(colorMatchExpression));

      // Update the fill-color property with the new expression
      map.setPaintProperty('output-areas', 'fill-color', colorMatchExpression);

      // Update the filter
      map.setFilter('output-areas', ['in', 'OA21CD', ...intersectingOACodes]);

      // Remove existing event listeners
      map.off('mousemove', 'output-areas');
      map.off('mouseleave', 'output-areas');

      updateSummaryStats(outputAreas)
      
      try {
        const treemapData = generateTreemapData(outputAreas);
        console.log('Treemap data:', treemapData);
        d3.select("#treemap-container").selectAll("*").remove(); // Clear previous treemap
        createTreemap(treemapData);
      } catch (error) {
        console.error('Error creating treemap:', error);
        // Optionally, display an error message to the user
      }

      // Add hover effect
      map.on('mousemove', 'output-areas', (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['output-areas'] });
          
          if (features.length > 0) {
              const feature = features[0];
              const oaCode = feature.properties.OA21CD;
              const oaInfo = oaInfoMap[oaCode];
              
              if (oaInfo) {
                  map.getCanvas().style.cursor = 'pointer';
                  
                  if (!currentPopup) {
                    currentPopup = new mapboxgl.Popup({
                        closeButton: false,
                        closeOnClick: false,
                        className: 'dark-popup'  // Add this line
                    });
                }

                  currentPopup.setLngLat(e.lngLat)
                    .setHTML(`
                      <div class="popup-content">
                        <h3>Output Area: ${oaCode}</h3>
                        <p><span class="color-indicator" style="background-color: ${supergroupColors[oaInfo.supergroupName]}"></span> Supergroup: ${oaInfo.supergroupName}</p>
                        <p>Group: ${oaInfo.groupName}</p>
                        <p>Subgroup: ${oaInfo.subgroupName}</p>
                      </div>
                    `)
                    .addTo(map);
                  }
                  
          } else {
              map.getCanvas().style.cursor = '';
              if (currentPopup) {
                  currentPopup.remove();
                  currentPopup = null;
              }
          }
      });

      // Remove popup when mouse leaves the output areas layer
      map.on('mouseleave', 'output-areas', () => {
          map.getCanvas().style.cursor = '';
          if (currentPopup) {
              currentPopup.remove();
              currentPopup = null;
          }
      });

      // Log unique Supergroups and their colors for debugging
      uniqueSupergroups.forEach(supergroup => {
          console.log(`Supergroup: ${supergroup}, Color: ${colorScale(supergroup)}`);
      });

      // Add a legend to the map
      addLegend(uniqueSupergroups, colorScale);
  } catch (error) {
      console.error('Error updating output areas:', error);
      alert('Error updating output areas. Please try again.');
  }
}

// ... (rest of the code remains unchanged)

function addLegend(uniqueSupergroups, colorScale) {
  let legendContainer = document.getElementById('legend');
  
  if (!legendContainer) {
    legendContainer = document.createElement('div');
    legendContainer.id = 'legend';
    legendContainer.style.position = 'absolute';
    legendContainer.style.top = '10px';
    legendContainer.style.right = '10px';
    legendContainer.style.backgroundColor = 'rgba(47, 43, 56,0.9)';
    legendContainer.style.padding = '10px';
    legendContainer.style.borderRadius = '5px';
    legendContainer.style.maxHeight = '300px';
    legendContainer.style.overflowY = 'auto';
    document.body.appendChild(legendContainer);
  }

  legendContainer.innerHTML = '<h4>Supergroup Legend</h4>';

  uniqueSupergroups.forEach(supergroup => {
    const item = document.createElement('div');
    const key = document.createElement('span');
    key.className = 'legend-key';
    key.style.backgroundColor = supergroupColors[supergroup];
    key.style.display = 'inline-block';
    key.style.width = '20px';
    key.style.height = '20px';
    key.style.marginRight = '5px';

    const value = document.createElement('span');
    value.innerHTML = supergroup;

    item.appendChild(key);
    item.appendChild(value);
    legendContainer.appendChild(item);
  });
}

// Format treemap data function
 
function formatTreemapData(data) {
  let formattedData = '';
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      formattedData += `${key}: ${data[key].value}\n`;
      if (data[key].children) {
        for (const childKey in data[key].children) {
          if (data[key].children.hasOwnProperty(childKey)) {
            formattedData += `  ${childKey}: ${data[key].children[childKey].value}\n`;
          }
        }
      }
    }
  }
  return formattedData;
}


// generate treemap data

function generateTreemapData(outputAreas) {
  console.log('Generating treemap data...');
  
  // Get the OA codes from the output areas
  const intersectingOAs = outputAreas.features.map(feature => feature.properties.OA21CD);
  
  // Filter the census features to only include those in the intersecting output areas
  const filteredFeatures = censusFeatures.filter(feature => intersectingOAs.includes(feature.geography));

  // Initialize the treemap data structure
  const treemapData = {
    name: "All",
    children: []
  };

  // Create a map to store the hierarchical structure
  const supergroupMap = new Map();

  // Iterate through the filtered features to build the hierarchical structure
  filteredFeatures.forEach(feature => {
    const supergroup = feature['Supergroup Name'] || 'Unknown Supergroup';
    const group = feature['Group Name'] || 'Unknown Group';
    const subgroup = feature['Subgroup Name'] || 'Unknown Subgroup';

    // Initialize supergroup if it doesn't exist
    if (!supergroupMap.has(supergroup)) {
      supergroupMap.set(supergroup, new Map());
    }
    const groupMap = supergroupMap.get(supergroup);

    // Initialize group if it doesn't exist
    if (!groupMap.has(group)) {
      groupMap.set(group, new Map());
    }
    const subgroupMap = groupMap.get(group);

    // Initialize subgroup count if it doesn't exist
    if (!subgroupMap.has(subgroup)) {
      subgroupMap.set(subgroup, 0);
    }
    
    // Increment the count for this subgroup
    subgroupMap.set(subgroup, subgroupMap.get(subgroup) + 1);
  });

  // Convert the map structure to the required treemap data format
  supergroupMap.forEach((groupMap, supergroup) => {
    const supergroupNode = { name: supergroup, children: [] };
    groupMap.forEach((subgroupMap, group) => {
      const groupNode = { name: group, children: [] };
      subgroupMap.forEach((count, subgroup) => {
        groupNode.children.push({ name: subgroup, value: count });
      });
      supergroupNode.children.push(groupNode);
    });
    treemapData.children.push(supergroupNode);
  });

  console.log('Treemap data generated:', treemapData);
  return treemapData;
}



function createTreemap(data) {
  console.log('Input data:', data);

  const container = d3.select("#treemap-container");
  container.selectAll("*").remove(); // Clear previous content

  const width = 300;
  const height = 550;

  function tile(node, x0, y0, x1, y1) {
    d3.treemapBinary(node, 0, 0, width, height);
    for (const child of node.children) {
      child.x0 = x0 + child.x0 / width * (x1 - x0);
      child.x1 = x0 + child.x1 / width * (x1 - x0);
      child.y0 = y0 + child.y0 / height * (y1 - y0);
      child.y1 = y0 + child.y1 / height * (y1 - y0);
    }
  }

  const hierarchy = d3.hierarchy(data)
    .sum(d => d.value)
    .sort((a, b) => b.value - a.value);
  const root = d3.treemap().tile(tile)(hierarchy);

  // Assign colors to all nodes based on their supergroup
  root.each(d => {
    if (d.depth === 0) {
      d.color = "#fff"; // root node
    } else if (d.depth === 1) {
      d.color = supergroupColors[d.data.name] || "#ccc";
    } else {
      d.color = d.parent.color;
    }
  });

  const x = d3.scaleLinear().rangeRound([0, width]);
  const y = d3.scaleLinear().rangeRound([0, height]);

  const format = d3.format(",d");
  const name = d => d.ancestors().reverse().map(d => d.data.name).join("/");

  const svg = container.append("svg")
    .attr("viewBox", [0.5, -30.5, width, height + 30])
    .attr("width", width)
    .attr("height", height + 30)
    .attr("style", "max-width: 100%; height: auto;")
    .style("font", "14px sans-serif"); // Increased base font size to 14px

  let group = svg.append("g")
    .call(render, root);

  function render(group, root) {
    const node = group
      .selectAll("g")
      .data(root.children.concat(root))
      .join("g");

    node.filter(d => d === root ? d.parent : d.children)
      .attr("cursor", "pointer")
      .on("click", (event, d) => d === root ? zoomout(root) : zoomin(d));

    node.append("title")
      .text(d => `${name(d)}\n${format(d.value)}`);

    node.append("rect")
      .attr("id", d => (d.leafUid = d3.select("leaf")).id)
      .attr("fill", d => d.color)
      .attr("stroke", "#fff");

    node.append("clipPath")
      .attr("id", d => (d.clipUid = d3.select("clip")).id)
      .append("use")
      .attr("xlink:href", d => d.leafUid.href);

    const text = node.append("text")
      .attr("clip-path", d => d.clipUid)
      .attr("font-weight", d => d === root ? "bold" : null)
      .style("font-size", "11px") // Fixed font size of 14px
      .attr("x", 3)
      .attr("y", 17); // Adjusted y position for larger font

    text.append("tspan")
      .text(d => d === root ? name(d) : d.data.name)
      .attr("fill", d => getContrastColor(d.color));

    text.append("tspan")
      .attr("fill-opacity", 0.7)
      .attr("x", 3)
      .attr("y", 27) // Adjusted y position for the second line
      .text(d => format(d.value))
      .attr("fill", d => getContrastColor(d.color));

    group.call(position, root);
  }

  function position(group, root) {
    group.selectAll("g")
      .attr("transform", d => {
        return d === root ? `translate(0,-30)` : `translate(${x(d.x0)},${y(d.y0)})`;
      })
      .select("rect")
      .attr("width", d => {
        return d === root ? width : Math.max(0, x(d.x1) - x(d.x0) - 1);
      })
      .attr("height", d => {
        return d === root ? 30 : Math.max(0, y(d.y1) - y(d.y0) - 1);
      });
  }

  function zoomin(d) {
    const group0 = group.attr("pointer-events", "none");
    const group1 = group = svg.append("g").call(render, d);

    x.domain([d.x0, d.x1]);
    y.domain([d.y0, d.y1]);

    svg.transition()
      .duration(750)
      .call(t => group0.transition(t).remove()
        .call(position, d.parent))
      .call(t => group1.transition(t)
        .attrTween("opacity", () => d3.interpolate(0, 1))
        .call(position, d));
  }

  function zoomout(d) {
    const group0 = group.attr("pointer-events", "none");
    const group1 = group = svg.insert("g", "*").call(render, d.parent);

    x.domain([d.parent.x0, d.parent.x1]);
    y.domain([d.parent.y0, d.parent.y1]);

    svg.transition()
      .duration(750)
      .call(t => group0.transition(t).remove()
        .attrTween("opacity", () => d3.interpolate(1, 0))
        .call(position, d))
      .call(t => group1.transition(t)
        .call(position, d.parent));
  }

  console.log('SVG element:', svg.node());
}

// Helper function to determine text color based on background color
function getContrastColor(hexcolor) {
  if (!hexcolor || hexcolor === "#fff") return 'black';
  
  // Convert hex to RGB
  let r = parseInt(hexcolor.substr(1,2),16);
  let g = parseInt(hexcolor.substr(3,2),16);
  let b = parseInt(hexcolor.substr(5,2),16);
  
  // Calculate luminance
  let yiq = ((r*299)+(g*587)+(b*114))/1000;
  
  // Return black or white depending on luminance
  return (yiq >= 128) ? 'black' : 'white';
}

// Summary Stats need modifying after uploading new files in 3 parts (headers are different) //


function updateSummaryStats(outputAreas) {
  console.log('updateSummaryStats called with:', outputAreas);
  const summaryStats = document.getElementById('summary-stats');
  summaryStats.innerHTML = '';

  // Get isochrone information
  const isochroneType = document.getElementById('isochrone-type').value;
  const isochroneValue = document.getElementById('isochrone-value').value;
  const postcode = document.getElementById('search-input').value;

  if (!outputAreas || !outputAreas.features || !Array.isArray(outputAreas.features)) {
    console.error('Invalid outputAreas data:', outputAreas);
    summaryStats.innerHTML = '<p>Error: Invalid data received. Please try again.</p>';
    return;
  }

  const intersectingOAs = outputAreas.features.map(feature => feature.properties?.OA21CD).filter(Boolean);
  const filteredFeatures = censusFeatures.filter(feature => intersectingOAs.includes(feature.geography));

  const totalOAs = outputAreas.features.length;
  const intersectingOAsCount = filteredFeatures.length;

  let summaryText = '';
  let oaList = ''; // New variable to store the list of output areas

  if (filteredFeatures.length > 0) {
    try {
      console.log('Calculating statistics...');

      // Age, Deprivation, and Cars
      const weightedAverageAgeSum = filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Weighted_Average_Age'] || 0), 0);
      const weightedAverageAgeMean = weightedAverageAgeSum / filteredFeatures.length;

      const weightedAverageDeprivationSum = filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Weighted_Average_Deprivation'] || 0), 0);
      const weightedAverageDeprivationMean = weightedAverageDeprivationSum / filteredFeatures.length;

      const weightedAverageCarsSum = filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Weighted_Average_Cars'] || 0), 0);
      const weightedAverageCarsMean = weightedAverageCarsSum / filteredFeatures.length;

      // Ethnicity
      const sumByEthnicity = {
        'White': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Ethnic.group|White'] || 0), 0),
        'Asian': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Ethnic.group|Asian|Asian.British.or.Asian.Welsh'] || 0), 0),
        'Black': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Ethnic.group|Black|Black.British|Black.Welsh|Caribbean.or.African'] || 0), 0),
      // Add the missing categories (here's where the error is likely happening) - delete if source won't be available
        'Mixed': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Ethnic.group|Mixed.or.Multiple.ethnic.groups'] || 0), 0),
        'Other': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Ethnic.group|Other.ethnic.group'] || 0), 0)
      };
      

      const totalEthnicity = filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Ethnic.group|Total|All.usual.residents'] || 0), 0);  // ERROR, unsure this is the right field, as it's lower than the sum of ethnicity

      const percentageByEthnicity = {
        'White': ((sumByEthnicity['White'] / totalEthnicity) * 100).toFixed(2),
        'Asian': ((sumByEthnicity['Asian'] / totalEthnicity) * 100).toFixed(2),
        'Black': ((sumByEthnicity['Black'] / totalEthnicity) * 100).toFixed(2),
        'Mixed': ((sumByEthnicity['Mixed'] / totalEthnicity) * 100).toFixed(2), 
        'Other': ((sumByEthnicity['Other'] / totalEthnicity) * 100).toFixed(2)
      };

      // Housing Type
      const sumByHousingType = {
        'Detached': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Accommodation.type|Detached'] || 0), 0),
        'Semi-detached': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Accommodation.type|Semi.detached'] || 0), 0),
        'Terraced': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Accommodation.type|Terraced'] || 0), 0),
      // Add the missing categories
        'Flat': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Accommodation.type|In.a.purpose.built.block.of.flats.or.tenement'] || 0), 0),
        'In Commercial Building': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Accommodation.type|In.a.commercial.building|for.example|in.an.office.building|hotel.or.over.a.shop'] || 0), 0),
        'Converted or shared house': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Accommodation.type|Part.of.a.converted.or.shared.house|including.bedsits'] || 0), 0),
        'Other converted building': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Accommodation.type|Part.of.another.converted.building|for.example|former.school|church.or.warehouse'] || 0), 0),
        'Caravan': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Accommodation.type|A.caravan.or.other.mobile.or.temporary.structure'] || 0), 0)
      };

      const totalHousingType = filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Accommodation.type|Total|All.households'] || 0), 0); 

    // Calculate percentages
      const percentageByHousingType = {
        'Detached': ((sumByHousingType['Detached'] / totalHousingType) * 100).toFixed(2),
        'Semi-detached': ((sumByHousingType['Semi-detached'] / totalHousingType) * 100).toFixed(2),
        'Terraced': ((sumByHousingType['Terraced'] / totalHousingType) * 100).toFixed(2),
        'Flat': ((sumByHousingType['Flat'] / totalHousingType) * 100).toFixed(2),
        'In Commercial Building': ((sumByHousingType['In Commercial Building'] / totalHousingType) * 100).toFixed(2),
        'Converted or shared house': ((sumByHousingType['Converted or shared house'] / totalHousingType) * 100).toFixed(2),
        'Other converted building': ((sumByHousingType['Other converted building'] / totalHousingType) * 100).toFixed(2),
        'Caravan': ((sumByHousingType['Caravan'] / totalHousingType) * 100).toFixed(2),
      };

      // Tenure
      const sumByTenure = {
        'Owned': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Tenure.of.household|Owned'] || 0), 0),
        'Social Rented': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Tenure.of.household|Social.rented'] || 0), 0),
        'Private Rented': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Tenure.of.household|Private.rented'] || 0), 0),
        'Lives Rent Free': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Tenure.of.household|Lives.rent.free'] || 0), 0),
        'Shared Ownership': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Tenure.of.household|Shared.ownership'] || 0), 0),
      };

      const totalTenure = filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Tenure.of.household|Total|All.households'] || 0), 0);

      const percentageByTenure = {
        'Owned': ((sumByTenure['Owned'] / totalTenure) * 100).toFixed(2),
        'Social Rented': ((sumByTenure['Social Rented'] / totalTenure) * 100).toFixed(2),
        'Private Rented': ((sumByTenure['Private Rented'] / totalTenure) * 100).toFixed(2),
        'Lives Rent Free': ((sumByTenure['Lives Rent Free'] / totalTenure) * 100).toFixed(2),
        'Shared Ownership': ((sumByTenure['Shared Ownership'] / totalTenure) * 100).toFixed(2)
      };

      // Religion 

      const sumByReligion = {
        'No religion': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Religion|No.religion'] || 0), 0),
        'Christian': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Religion|Christian'] || 0), 0),
        'Buddhist': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Religion|Buddhist'] || 0), 0),
        'Hindu': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Religion|Hindu'] || 0), 0),
        'Jewish': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Religion|Jewish'] || 0), 0),
        'Muslim': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Religion|Muslim'] || 0), 0),
        'Sikh': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Religion|Sikh'] || 0), 0),
        'Other religion': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Religion|Other.religion'] || 0), 0),
        'Not answered': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Religion|Not.answered'] || 0), 0)
      };

      const totalReligion = filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Religion|Total|All.usual.residents'] || 0), 0);

      // Calculate percentages for Religion (note, Claude gave me a different method of calculation, seems more efficient)
      const percentageByReligion = Object.fromEntries(
        Object.entries(sumByReligion)
          .filter(([key]) => key !== 'Total')
          .map(([key, value]) => [key, ((value / totalReligion) * 100).toFixed(2)])
      );

      // Travel to Work
      const sumByTravelToWork = {
        'Driving a Car or Van': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Method.of.travel.to.workplace|Driving.a.car.or.van'] || 0), 0),
        'Work Mainly at or from Home': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Method.of.travel.to.workplace|Work.mainly.at.or.from.home'] || 0), 0)
      };

      const totalTravelToWork = filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Method.of.travel.to.workplace|Total|All.usual.residents.aged.16.years.and.over.in.employment.the.week.before.the.census'] || 0), 0);

      const percentageByTravelToWork = {
        'Driving a Car or Van': ((sumByTravelToWork['Driving a Car or Van'] / totalTravelToWork) * 100).toFixed(2),
        'Work Mainly at or from Home': ((sumByTravelToWork['Work Mainly at or from Home'] / totalTravelToWork) * 100).toFixed(2)
      };

      // Qualifications
      const sumByQualification = {
        'No Qualifications': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Highest.level.of.qualification|No.qualifications'] || 0), 0),
        'Level 1 and Entry': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Highest.level.of.qualification|Level.1.and.entry.level.qualifications'] || 0), 0),
        'Level 2 Qualifications': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Highest.level.of.qualification|Level.2.qualifications'] || 0), 0),
        'Apprenticeship': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Highest.level.of.qualification|Apprenticeship'] || 0), 0),
        'Level 3 Qualifications': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Highest.level.of.qualification|Level.3.qualifications'] || 0), 0),
        'Level 4 Qualifications and Above': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Highest.level.of.qualification|Level.4.qualifications.and.above'] || 0), 0),
        'Other Qualifications': filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Highest.level.of.qualification|Other.qualifications'] || 0), 0)
      };

      const totalQualification = filteredFeatures.reduce((sum, feature) => sum + parseFloat(feature['Highest.level.of.qualification|Total|All.usual.residents.aged.16.years.and.over'] || 0), 0);

      const percentageByQualification = {
        'No Qualifications': ((sumByQualification['No Qualifications'] / totalQualification) * 100).toFixed(2),
        'Level 1 and Entry': ((sumByQualification['Level 1 and Entry'] / totalQualification) * 100).toFixed(2),
        'Level 2 Qualifications': ((sumByQualification['Level 2 Qualifications'] / totalQualification) * 100).toFixed(2),
        'Apprenticeship': ((sumByQualification['Apprenticeship'] / totalQualification) * 100).toFixed(2),
        'Level 3 Qualifications': ((sumByQualification['Level 3 Qualifications'] / totalQualification) * 100).toFixed(2),
        'Level 4 Qualifications and Above': ((sumByQualification['Level 4 Qualifications and Above'] / totalQualification) * 100).toFixed(2),
        'Other Qualifications': ((sumByQualification['Other Qualifications'] / totalQualification) * 100).toFixed(2)
      };

      console.log('Statistics calculated successfully');

      // Generate treemap data
      console.log('Generating treemap data...');
      const treemapData = generateTreemapData(outputAreas);
      const readableTreemapData = formatTreemapDataReadable(treemapData);
      console.log('Treemap data generated successfully');

      summaryText = `
        <p>Total Output Areas: ${totalOAs}</p>
        <p>Intersecting Output Areas: ${intersectingOAsCount}</p>
        <p>Total Population: ${totalEthnicity}</p>
        <p>Average Age: ${weightedAverageAgeMean.toFixed(2)}</p>
        <p>Average Deprivation: ${weightedAverageDeprivationMean.toFixed(2)}</p>
        <p>Average Cars: ${weightedAverageCarsMean.toFixed(2)}</p>
        <h3>Ethnicity</h3>
        <ul>
          <li>White: ${sumByEthnicity['White']} (${percentageByEthnicity['White']}%)</li>
          <li>Asian: ${sumByEthnicity['Asian']} (${percentageByEthnicity['Asian']}%)</li>
          <li>Black: ${sumByEthnicity['Black']} (${percentageByEthnicity['Black']}%)</li>
          <li>Mixed: ${sumByEthnicity['Mixed']} (${percentageByEthnicity['Mixed']}%)</li>
          <li>Other: ${sumByEthnicity['Other']} (${percentageByEthnicity['Other']}%)</li>
        </ul>
        <h3>Housing Type</h3>
        <ul>
                  <li>Detached: ${sumByHousingType['Detached']} (${percentageByHousingType['Detached']}%)</li>
                  <li>Semi-detached: ${sumByHousingType['Semi-detached']} (${percentageByHousingType['Semi-detached']}%)</li>
                  <li>Terraced: ${sumByHousingType['Terraced']} (${percentageByHousingType['Terraced']}%)</li>
                  <li>Flat, maisonette or apartment: ${sumByHousingType['Flat']} (${percentageByHousingType['Flat']}%)</li>
                  <li>In commercial building: ${sumByHousingType['In Commercial Building']} (${percentageByHousingType['In Commercial Building']}%)</li>
                  <li>Converted or shared house: ${sumByHousingType['Converted or shared house']} (${percentageByHousingType['Converted or shared house']}%)</li>
                  <li>Other converted building: ${sumByHousingType['Other converted building']} (${percentageByHousingType['Other converted building']}%)</li>
                  <li>Caravan or other mobile structure: ${sumByHousingType['Caravan']} (${percentageByHousingType['Caravan']}%)</li>
        </ul>
        <h3>Tenure</h3>
        <ul>
          <li>Owned: ${sumByTenure['Owned']} (${percentageByTenure['Owned']}%)</li>
          <li>Social Rented: ${sumByTenure['Social Rented']} (${percentageByTenure['Social Rented']}%)</li>
          <li>Private Rented: ${sumByTenure['Private Rented']} (${percentageByTenure['Private Rented']}%)</li>
          <li>Lives Rent Free: ${sumByTenure['Lives Rent Free']} (${percentageByTenure['Lives Rent Free']}%)</li>
          <li>Shared Ownership: ${sumByTenure['Shared Ownership']} (${percentageByTenure['Shared Ownership']}%)</li>
        </ul>
        <h3>Religion</h3>
        <ul>
          <li>No religion: ${sumByReligion['No religion']} (${percentageByReligion['No religion']}%)</li>
          <li>Christian: ${sumByReligion['Christian']} (${percentageByReligion['Christian']}%)</li>
          <li>Buddhist: ${sumByReligion['Buddhist']} (${percentageByReligion['Buddhist']}%)</li>
          <li>Hindu: ${sumByReligion['Hindu']} (${percentageByReligion['Hindu']}%)</li>
          <li>Jewish: ${sumByReligion['Jewish']} (${percentageByReligion['Jewish']}%)</li>
          <li>Muslim: ${sumByReligion['Muslim']} (${percentageByReligion['Muslim']}%)</li>
          <li>Sikh: ${sumByReligion['Sikh']} (${percentageByReligion['Sikh']}%)</li>
          <li>Other religion: ${sumByReligion['Other religion']} (${percentageByReligion['Other religion']}%)</li>
          <li>Not answered: ${sumByReligion['Not answered']} (${percentageByReligion['Not answered']}%)</li>
        </ul>
        <h3>Travel to Work</h3>
        <ul>
          <li>Driving: ${sumByTravelToWork['Driving a Car or Van']} (${percentageByTravelToWork['Driving a Car or Van']}%)</li>
          <li>Work from Home: ${sumByTravelToWork['Work Mainly at or from Home']} (${percentageByTravelToWork['Work Mainly at or from Home']}%)</li>
        </ul>
        <h3>Qualifications</h3>
        <ul>
         <li>No Qualifications: ${sumByQualification['No Qualifications']} (${percentageByQualification['No Qualifications']}%)</li>
        <li>Level 1 and Entry: ${sumByQualification['Level 1 and Entry']} (${percentageByQualification['Level 1 and Entry']}%)</li>
        <li>Level 2 Qualifications: ${sumByQualification['Level 2 Qualifications']} (${percentageByQualification['Level 2 Qualifications']}%)</li>
        <li>Apprenticeship: ${sumByQualification['Apprenticeship']} (${percentageByQualification['Apprenticeship']}%)</li>
        <li>Level 3 Qualifications: ${sumByQualification['Level 3 Qualifications']} (${percentageByQualification['Level 3 Qualifications']}%)</li>
        <li>Level 4 Qualifications and Above: ${sumByQualification['Level 4 Qualifications and Above']} (${percentageByQualification['Level 4 Qualifications and Above']}%)</li>
        <li>Other Qualifications: ${sumByQualification['Other Qualifications']} (${percentageByQualification['Other Qualifications']}%)</li>
        </ul>
        <h3>Treemap Data:</h3>
        <pre>${readableTreemapData}</pre>
      `;

        // Create the list of output areas
        oaList = intersectingOAs.join(', ');

        console.log('Summary text generated successfully');



  
      // Update the treemap visualization
      createTreemap(treemapData);
    } catch (error) {
      console.error('Error calculating summary stats:', error);
      summaryText = `<p>An error occurred while calculating summary statistics: ${error.message}. Please try again.</p>`;
    }
  } else {
    summaryText = `
      <p>Total Output Areas: ${totalOAs}</p>
      <p>No intersecting output areas found.</p>
    `;
  }

  summaryStats.innerHTML = summaryText;

  const exportButton = document.getElementById('export-button');
  exportButton.removeEventListener('click', exportSummaryStats);
  exportButton.addEventListener('click', () => exportSummaryStats(summaryText, isochroneType, isochroneValue, postcode, oaList));
}

function exportSummaryStats(summaryText, isochroneType, isochroneValue, postcode, oaList) {
  try {
    const exportWindow = window.open('', '_blank');
    if (!exportWindow) {
      throw new Error('Popup blocked. Please allow popups for this site.');
    }

    const isochroneInfo = `
      <h2>Isochrone Information</h2>
      <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
        <tr><th align="left">Postcode</th><td>${postcode}</td></tr>
        <tr><th align="left">Isochrone Type</th><td>${isochroneType}</td></tr>
        <tr><th align="left">Isochrone Value</th><td>${isochroneValue} ${isochroneType === 'time' ? 'minutes' : 'miles'}</td></tr>
      </table>
    `;

    const outputAreasList = `
      <h2>List of Output Areas</h2>
      <div style="word-break: break-all;">
        ${oaList.replace(/,\s*/g, ';')}
      </div>
    `;

    const tableContent = convertToTable(summaryText);

    // Extract treemap data from summaryText
    const treemapDataMatch = summaryText.match(/<h3>Treemap Data:<\/h3>\s*<pre>([\s\S]*?)<\/pre>/);
    const treemapContent = treemapDataMatch 
      ? `<h2>Treemap Data</h2><pre style="white-space: pre-wrap; word-break: break-all;">${treemapDataMatch[1]}</pre>`
      : '<h2>Treemap Data</h2><p>No treemap data available</p>';

    exportWindow.document.write(`
      <html>
        <head>
          <title>Exported Summary Stats</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
            table { margin-bottom: 20px; width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; }
            pre { background-color: #f8f8f8; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
          </style>
        </head>
        <body>
          ${isochroneInfo}
          <h2>Summary Statistics</h2>
          ${tableContent}
          ${treemapContent}
          ${outputAreasList}
        </body>
      </html>
    `);
    exportWindow.document.close();
  } catch (error) {
    console.error('Error exporting summary stats:', error);
    alert('Failed to export summary stats. ' + error.message);
  }
}

function convertTreemapToTable(treemapData) {
  let tableHtml = '<table class="treemap-table" border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">';
  tableHtml += '<tr><th>Category</th><th>Value</th></tr>';

  function addRowsRecursively(node, depth = 0) {
    if (!node) return;

    const paddingLeft = depth * 20;
    
    if (typeof node === 'object') {
      Object.entries(node).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          tableHtml += `<tr><td style="padding-left: ${paddingLeft}px;"><strong>${key}</strong></td><td></td></tr>`;
          addRowsRecursively(value, depth + 1);
        } else {
          tableHtml += `<tr><td style="padding-left: ${paddingLeft}px;">${key}</td><td>${value}</td></tr>`;
        }
      });
    } else {
      tableHtml += `<tr><td style="padding-left: ${paddingLeft}px;">Value</td><td>${node}</td></tr>`;
    }
  }

  addRowsRecursively(treemapData);
  tableHtml += '</table>';
  return tableHtml;
}


function convertToTable(summaryText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(summaryText, 'text/html');
  let tableHtml = '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">';
  
  // Add table header
  tableHtml += '<tr><th>Metric</th><th>Value</th><th>Percentage</th></tr>';

  let skipTreemapData = false;

  for (let i = 0; i < doc.body.childNodes.length; i++) {
    const node = doc.body.childNodes[i];

    if (node.nodeName === 'H3' && node.textContent.trim().toLowerCase() === 'treemap data:') {
      skipTreemapData = true;
      continue;
    }

    if (skipTreemapData) {
      if (node.nodeName === 'H3') {
        skipTreemapData = false;
      } else {
        continue;
      }
    }

    if (node.nodeName === 'P') {
      const [key, value] = node.textContent.split(':');
      tableHtml += `<tr><th align="left">${key}</th><td>${value || ''}</td><td></td></tr>`;
    } else if (node.nodeName === 'H3') {
      tableHtml += `<tr><th colspan="3" align="left" style="background-color: #f0f0f0;">${node.textContent}</th></tr>`;
    } else if (node.nodeName === 'UL') {
      const items = Array.from(node.getElementsByTagName('li'));
      items.forEach(item => {
        const [key, valueWithPercentage] = item.textContent.split(':');
        const [value, percentageWithParentheses] = valueWithPercentage.trim().split('(');
        const percentage = percentageWithParentheses ? percentageWithParentheses.replace(')', '') : '';
        tableHtml += `<tr><td>${key}</td><td>${value.trim()}</td><td>${percentage}</td></tr>`;
      });
    }
  }

  tableHtml += '</table>';
  return tableHtml;
}




function formatTreemapDataReadable(data, indent = '') {
  let result = '';
  if (data.name === 'All') {
    data.children.forEach(supergroup => {
      result += formatTreemapDataReadable(supergroup, indent);
    });
  } else if (data.children) {
    result += `${indent}${data.name}:\n`;
    data.children.forEach(child => {
      result += formatTreemapDataReadable(child, indent + '  ');
    });
  } else {
    result += `${indent}${data.name}: ${data.value}\n`;
  }
  return result;
}

function generateOAList(outputAreas) {
  const oaList = outputAreas.features.map(feature => feature.properties.OA21CD);
  return oaList.join('\n');
}


