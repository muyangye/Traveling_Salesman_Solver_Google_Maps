const CONVERT_TO_RADIAN_CONST = 0.0174533;

function loadScript() {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://maps.googleapis.com/maps/api/js?key=" + config["apiKey"] + "&callback=initMap&v=weekly";
    script.defer = true;
    document.body.appendChild(script);
}

function initMap() {
    let waypointsJSON = localStorage.getItem("waypoints");
    let returnToOrigin = localStorage.getItem("returnToOrigin");
    let waypoints = JSON.parse(waypointsJSON);

    const map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: waypoints[0].lat / CONVERT_TO_RADIAN_CONST, lng: waypoints[0].lon / CONVERT_TO_RADIAN_CONST},
        zoom: 8,
    });

    class Waypoint{
        constructor(name, location) {
        this.name = name;
        this.lat = location.lat();
        this.lon = location.lng();
        }
    }
    
    var poly = new google.maps.Polyline({
        editable: true,
        path: []
    });

    let popSize = config["popSize"];
    let numIterations = config["numIterations"];
    let mutChance = config["mutChance"];

    // Fisher-Yates shuffle algorithm
    function shuffle(individual) {
        let i = individual.length;
        while (--i > 0) {
            let temp = Math.floor(Math.random() * (i + 1));
            [individual[temp], individual[i]] = [individual[i], individual[temp]];
        }
    }

    // Generate initial population
    function genInitialPopulation(population) {
        let individual = [];
        let zero = [0];
        for (let i = 0; i < popSize; ++i) {
            individual = [...Array(waypoints.length - 1).keys()].map(j => ++j);
            shuffle(individual);
            population.push(zero.concat(individual));
        }
    }

    // Calculate the Haversine distance between two waypoints
    function getHaversineDistance(waypoint1, waypoint2) {
        let dlon = waypoint2.lon - waypoint1.lon;
        let lat1 = waypoint1.lat;
        let lat2 = waypoint2.lat;
        let dlat = lat2 - lat1;
        let a = Math.pow(Math.sin(dlat/2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dlon/2), 2);
        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return 3961 * c;
    }

    function calcTotalDistance(waypoints, individual) {
        let totalDistance = 0;
        for (let i = 0; i < individual.length - 1; ++i) {
            totalDistance += getHaversineDistance(waypoints[individual[i]], waypoints[individual[i+1]]);
        }
        // Add distance back to origin if returnToOrigin is set to true
        return returnToOrigin === "true" ? totalDistance + getHaversineDistance(waypoints[0], waypoints[individual[individual.length - 1]]) : totalDistance;
    }

    function normalize(probabilities) {
        let sum = probabilities.reduce(function(a, b) {
            return a + b;
        }, 0);
        probabilities.forEach((probability, index) => {
            probabilities[index] /= sum;
        });
    }

    function getRandomInclusive() {
        return Math.random() == 0 ? 1 : Math.random();
    }

    function getRandomIntInclusive(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function genNewPopulation(newPopulation, crossoverIndex, individual1, individual2) {
        let newIndividual = [];
        ++crossoverIndex;
        for (let i = 0; i < crossoverIndex; ++i) {
            newIndividual.push(individual1[i]);
        }
        for (let i = 0; i < individual2.length; ++i) {
            if (!newIndividual.includes(individual2[i])) {
                newIndividual.push(individual2[i]);
            }
        }
        let random = getRandomInclusive();
        if (random <= mutChance) {
            let index1 = getRandomIntInclusive(1, newIndividual.length - 1);
            let index2 = getRandomIntInclusive(1, newIndividual.length - 1);
            [newIndividual[index1], newIndividual[index2]] = [newIndividual[index2], newIndividual[index1]];
        }
        newPopulation.push(newIndividual);
    }

    function addToPath(polyPath, latlng, count) {
        polyPath.push(latlng);
        if (count != waypoints.length+1) {
            new google.maps.Marker({
                position: latlng,
                label: {text: count.toString(), color: "#00FF00"},
                animation: google.maps.Animation.DROP,
                map: map,
        });
        }
    }

    function startNewCalculation() {
        window.location.href = "index.html";
    }
    document.getElementById("goto-index").addEventListener("click", startNewCalculation);
    let waypointsList = document.getElementById("waypoints-list");

    let population = [];
    genInitialPopulation(population);
    for (let i = 0; i <= numIterations; ++i) {
        // fitness[i] <==> the ith route's total distance
        let fitness = [];
        population.forEach(individual => {
            fitness.push(calcTotalDistance(waypoints, individual));
        });
        let sortedIndexes = [...Array(popSize).keys()]
            .sort((index1, index2) => {
                return fitness[index1] < fitness[index2] ? -1 : 1;
            });
        let probabilities = new Array(popSize).fill(1.0 / popSize);
        probabilities[sortedIndexes[0]] *= 6;
        probabilities[sortedIndexes[1]] *= 6;
        for (let j = 0; j < popSize / 2; ++j) {
            probabilities[sortedIndexes[j]] *= 3;
        }
        normalize(probabilities);
        if (i == numIterations) {
            let solution = population[sortedIndexes[0]];
            // console.log(solution);
            let polyPath = [];
            let count = 0;
            let waypointElement = null;
            solution.forEach(waypointIndex => {
                waypoint = waypoints[waypointIndex];
                waypointElement = document.createElement("li");
                waypointElement.append(waypoint.name);
                waypointsList.appendChild(waypointElement);
                addToPath(polyPath, new google.maps.LatLng(waypoint.lat / CONVERT_TO_RADIAN_CONST, waypoint.lon / CONVERT_TO_RADIAN_CONST), ++count);
            });
            if (returnToOrigin === "true") {
                addToPath(polyPath, new google.maps.LatLng(waypoints[0].lat / CONVERT_TO_RADIAN_CONST, waypoints[0].lon / CONVERT_TO_RADIAN_CONST), ++count);
            }
            poly.setPath(polyPath);
            poly.setMap(map);
            break;
        }
        // console.log(fitness);
        let index1 = 0;
        let index2 = 0;
        let random = 0;
        let currSum = 0;
        let crossoverIndex = 0;
        let aGoesFirst = 0;
        let newPopulation = [];
        for (let j = 0; j < popSize; ++j) {
            currSum = 0;
            random = getRandomInclusive();
            for (let k = 0; k < popSize; ++k) {
                currSum += probabilities[k];
                if (currSum >= random) {
                    index1 = k;
                    break;
                }
            }
            currSum = 0;
            random = getRandomInclusive();
            for (let k = 0; k < popSize; ++k) {
                currSum += probabilities[k];
                if (currSum >= random) {
                    index2 = k;
                    break;
                }
            }
            crossoverIndex = getRandomIntInclusive(1, waypoints.length - 2);
            aGoesFirst = getRandomIntInclusive(0, 1);
            aGoesFirst ? genNewPopulation(newPopulation, crossoverIndex, population[index1], population[index2])
                : genNewPopulation(newPopulation, crossoverIndex, population[index2], population[index1]);
        }
        population = newPopulation;
    }
}