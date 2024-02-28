const CONVERT_TO_RADIAN_CONST = 0.0174533;

function loadScript() {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://maps.googleapis.com/maps/api/js?key=" + config["apiKey"] + "&callback=initMap&libraries=places&v=weekly";
    script.defer = true;
    document.body.appendChild(script);
}

class Waypoint{
    constructor(name, location) {
        this.name = name;
        this.lat = location.lat();
        this.lon = location.lng();
    }
}

function initMap() {
    const map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 40.749933, lng: -73.98633 },
        zoom: 13,
        mapTypeControl: false,
    });
    const card = document.getElementById("pac-card");
    const input = document.getElementById("pac-input");
    const biasInputElement = document.getElementById("use-location-bias");
    const strictBoundsInputElement = document.getElementById("use-strict-bounds");
    const options = {
        fields: ["formatted_address", "geometry", "name"],
        strictBounds: false,
    };

    let waypoints = [];
    function showResult() {
        if (waypoints.length < 2) {
            alert("Please enter at least 2 waypoints!");
        }
        else {
            let returnToOrigin = document.querySelector("#return-to-origin").checked;
            localStorage.setItem("waypoints", JSON.stringify(waypoints));
            localStorage.setItem("returnToOrigin", returnToOrigin);
            window.location.href = "result.html";
        }
    }
    document.getElementById("goto-result").addEventListener("click", showResult);

    function deleteWaypoint(currentElement, waypoint) {
        waypoints.splice(waypoints.indexOf(waypoint), 1);
        currentElement.closest("ul").removeChild(currentElement.parentNode);
    }

    let waypointsList = document.getElementById("waypoints-list");

    map.controls[google.maps.ControlPosition.TOP_LEFT].push(card);

    const autocomplete = new google.maps.places.Autocomplete(input, options);

    // Bind the map's bounds (viewport) property to the autocomplete object,
    // so that the autocomplete requests use the current map bounds for the
    // bounds option in the request.
    autocomplete.bindTo("bounds", map);

    const infowindow = new google.maps.InfoWindow();
    const infowindowContent = document.getElementById("infowindow-content");

    infowindow.setContent(infowindowContent);

    const marker = new google.maps.Marker({
        map,
        anchorPoint: new google.maps.Point(0, -29),
    });

    autocomplete.addListener("place_changed", () => {
        infowindow.close();
        marker.setVisible(false);

        const place = autocomplete.getPlace();
        let waypoint = new Waypoint(place.formatted_address, place.geometry.location);

        // Add a waypoint to the waypoints list
        let waypointElement = document.createElement("li");
        waypointElement.append(place.name);
        let deleteButton = document.createElement("button");
        deleteButton.innerHTML = "X";
        deleteButton.addEventListener("click", function(event) {
            deleteWaypoint(event.currentTarget, waypoint);
        });
        deleteButton.setAttribute("style", "border-radius: 70%; height: 30px; width: 30px; color: #FFFFFF; background-color: #FF0000;\
            margin-left: 20px; border: none;");
        waypointElement.appendChild(deleteButton);
        waypointsList.appendChild(waypointElement);
        // Create a ul to store the waypoint information
        let waypointElementList = document.createElement("ul");
        waypointElement.appendChild(waypointElementList);
        let waypointAddress = document.createElement("li");
        let waypointLat = document.createElement("li");
        let waypointLon = document.createElement("li");
        waypointAddress.appendChild(document.createTextNode("Full Address: " + waypoint.name));
        waypointLat.appendChild(document.createTextNode("Latitude: " + waypoint.lat));
        waypointLon.appendChild(document.createTextNode("Longtitude: " + waypoint.lon));
        waypointElementList.appendChild(waypointAddress);
        waypointElementList.appendChild(waypointLat);
        waypointElementList.appendChild(waypointLon);

        // Convert lat and lon to radians
        waypoint.lat *= CONVERT_TO_RADIAN_CONST;
        waypoint.lon *= CONVERT_TO_RADIAN_CONST;
        waypoints.push(waypoint);

        if (!place.geometry || !place.geometry.location) {
            // User entered the name of a Place that was not suggested and
            // pressed the Enter key, or the Place Details request failed.
            window.alert("No details available for input: '" + place.name + "'");
            return;
        }

        // If the place has a geometry, then present it on a map.
        if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
        } else {
            map.setCenter(place.geometry.location);
            map.setZoom(17);
        }

        marker.setPosition(place.geometry.location);
        marker.setVisible(true);
        infowindowContent.children["place-name"].textContent = place.name;
        infowindowContent.children["place-address"].textContent =
            place.formatted_address;
        infowindow.open(map, marker);
    });
}