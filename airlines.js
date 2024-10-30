const fs = require('fs');

// Function to read a CSV file and parse its content
function readCsv(filename, delimiter = ',') {
    try {
        const fileContent = fs.readFileSync(filename, { encoding: 'utf-8' });
        return fileContent.split('\n').slice(1).map(row => row.trim().split(delimiter).map(col => col.trim())).filter(row => row.length > 1);
    } catch (err) {
        console.error("Error reading file:", err.message);
        return null;
    }
}

// Function to find details by matching a key in a dataset
function findDetails(key, dataSet, keyIndex) {
    return dataSet.find(item => item[keyIndex].toUpperCase() === key.toUpperCase());
}

// Function to validate parsed data and log errors
function validateParsedData(data, dataType) {
    if (isNaN(data)) {
        console.error(`Invalid ${dataType} value: ${data}`);
        return false;
    }
    return true;
}

// Function to calculate the profit or loss of a flight
function calculateFlightProfit({ ukAirport, overseasAirport, aircraftType, economySeats, businessSeats, firstClassSeats, economyPrice, businessPrice, firstClassPrice }, airports, aircrafts) {
    const airport = findDetails(overseasAirport, airports, 0);
    if (!airport) {
        console.error(`Invalid overseas airport code: ${overseasAirport}. Available codes: ${airports.map(a => a[0]).join(', ')}`);
        return null;
    }

    const aircraft = findDetails(aircraftType, aircrafts, 0);
    if (!aircraft) {
        console.error(`Invalid aircraft type: ${aircraftType}`);
        return null;
    }

    const distance = ukAirport === 'MAN' ? parseFloat(airport[2]) : parseFloat(airport[3]);
    const runningCostPerSeatPer100km = parseFloat(aircraft[1].replace(/[^0-9.]/g, ''));
    const maxFlightRange = parseFloat(aircraft[2]);
    const totalSeats = parseInt(aircraft[3]);

    if (![distance, runningCostPerSeatPer100km, maxFlightRange, totalSeats].every((val, idx) => validateParsedData(val, ['distance', 'running cost', 'max flight range', 'total seats'][idx]))) {
        return null;
    }

    if (distance > maxFlightRange) {
        console.error(`Flight distance (${distance} km) exceeds maximum flight range of the aircraft (${maxFlightRange} km).`);
        return null;
    }

    const totalBookedSeats = economySeats + businessSeats + firstClassSeats;
    if (totalBookedSeats > totalSeats) {
        console.error(`Overbooking error: ${totalBookedSeats} seats booked but aircraft only has ${totalSeats} seats.`);
        return null;
    }

    const income = (economySeats * economyPrice) + (businessSeats * businessPrice) + (firstClassSeats * firstClassPrice);
    if (!validateParsedData(income, 'income')) return null;

    const costPerSeat = runningCostPerSeatPer100km * (distance / 100);
    const totalCost = costPerSeat * totalBookedSeats;
    if (!validateParsedData(totalCost, 'total cost')) return null;

    const profit = income - totalCost;
    const breakEvenSeats = Math.ceil(totalCost / ((economyPrice + businessPrice + firstClassPrice) / 3));
    const loadFactor = ((totalBookedSeats / totalSeats) * 100).toFixed(2);
    const profitMargin = ((profit / income) * 100).toFixed(2);

    return {
        ukAirport,
        overseasAirport,
        aircraftType,
        economySeats,
        businessSeats,
        firstClassSeats,
        income: income.toFixed(2),
        cost: totalCost.toFixed(2),
        profit: profit.toFixed(2),
        breakEvenSeats,
        loadFactor,
        profitMargin
    };
}

// Function to parse flight data
function parseFlightData(flight) {
    const [ukAirport, overseasAirport, aircraftType, economySeats, businessSeats, firstClassSeats, economyPrice, businessPrice, firstClassPrice] = flight;
    return {
        ukAirport,
        overseasAirport,
        aircraftType,
        economySeats: parseInt(economySeats),
        businessSeats: parseInt(businessSeats),
        firstClassSeats: parseInt(firstClassSeats),
        economyPrice: parseFloat(economyPrice),
        businessPrice: parseFloat(businessPrice),
        firstClassPrice: parseFloat(firstClassPrice)
    };
}

// Function to process flight data
function processFlightData(flightsFile, airportsFile, aircraftsFile, outputFile, isValid = true) {
    const airports = readCsv(airportsFile);
    const aircrafts = readCsv(aircraftsFile);
    const flights = readCsv(flightsFile);

    if (!airports || !aircrafts || !flights) {
        console.error("Error: Could not load necessary data files.");
        return;
    }

    const results = flights.map(flight => {
        const flightData = parseFlightData(flight);
        return calculateFlightProfit(flightData, airports, aircrafts);
    }).filter(result => result !== null);

    if (isValid && results.length > 0) {
        const outputContent = results.map(result => (
            `Flight from ${result.ukAirport} to ${result.overseasAirport} using ${result.aircraftType}:
` +
            `  Economy Seats: ${result.economySeats}, Business Seats: ${result.businessSeats}, First Class Seats: ${result.firstClassSeats}
` +
            `  Income: £${result.income}, Cost: £${result.cost}, Profit: £${result.profit}
` +
            `  Break-even Seats: ${result.breakEvenSeats}, Load Factor: ${result.loadFactor}%, Profit Margin: ${result.profitMargin}%
`
        )).join('\n');

        fs.writeFileSync(outputFile, outputContent, { encoding: 'utf-8' });
        console.log(`Results written to ${outputFile}`);
    } else if (!isValid) {
        results.forEach(result => console.log("Valid flight:", result));
    }
}

// Usage example
processFlightData('valid_flight_data.csv', 'airports.csv', 'aeroplanes.csv', 'flight_results.txt');
processFlightData('invalid_flight_data.csv', 'airports.csv', 'aeroplanes.csv', null, false);
