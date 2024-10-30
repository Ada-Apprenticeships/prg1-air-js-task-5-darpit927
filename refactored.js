const fs = require('fs');

// Constants for UK Airports
const UK_AIRPORTS = {
  MAN: 'MAN',
  LHR: 'LHR'
};

// Function to read a CSV file and parse its content
function readCsv(filename, delimiter = ',') {
  try {
    const fileContent = fs.readFileSync(filename, { encoding: 'utf-8' });
    return fileContent.split('\n').slice(1).map(row => row.trim().split(delimiter).map(col => col.trim())).filter(row => row.length > 1);
  } catch (err) {
    console.error("Error reading file: " + err.message);
    return null;
  }
}

// Class to represent a Flight
class Flight {
  constructor(ukAirport, overseasAirport, aircraftType, economySeats, businessSeats, firstClassSeats, economyPrice, businessPrice, firstClassPrice) {
    this.ukAirport = ukAirport;
    this.overseasAirport = overseasAirport;
    this.aircraftType = aircraftType;
    this.seats = [
      parseInt(economySeats),
      parseInt(businessSeats),
      parseInt(firstClassSeats)
    ];
    this.prices = [
      parseFloat(economyPrice),
      parseFloat(businessPrice),
      parseFloat(firstClassPrice)
    ];
  }
}

// Class to represent Airport
class Airport {
  constructor(code, name, distanceFromMan, distanceFromLhr) {
    this.code = code;
    this.name = name;
    this.distanceFromMan = parseFloat(distanceFromMan);
    this.distanceFromLhr = parseFloat(distanceFromLhr);
  }
}

// Class to represent Aircraft
class Aircraft {
  constructor(type, runningCostPerSeatPer100km, maxFlightRange, totalSeats) {
    this.type = type;
    this.runningCostPerSeatPer100km = parseFloat(runningCostPerSeatPer100km.replace(/[^0-9.]/g, ''));
    this.maxFlightRange = parseFloat(maxFlightRange);
    this.totalSeats = parseInt(totalSeats);
  }
}

// Class to handle Flight Profit Calculation
class FlightProfitCalculator {
  constructor(airports, aircrafts) {
    this.airports = airports;
    this.aircrafts = aircrafts;
  }

  findDetails(key, dataSet, keyProperty) {
    return dataSet.find(item => item[keyProperty].toUpperCase() === key.toUpperCase());
  }

  validateParsedData(data, dataType) {
    if (isNaN(data)) {
      console.error(`Invalid ${dataType} value: ${data}`);
      return false;
    }
    return true;
  }

  getDistance(flight, airport) {
    return flight.ukAirport === UK_AIRPORTS.MAN ? airport.distanceFromMan : airport.distanceFromLhr;
  }

  calculateProfit(flight) {
    const airport = this.findDetails(flight.overseasAirport, this.airports, 'code');
    if (!airport) {
      console.error(`Invalid overseas airport code: ${flight.overseasAirport}. Available codes: ${this.airports.map(a => a.code).join(', ')}`);
      return null;
    }

    const aircraft = this.findDetails(flight.aircraftType, this.aircrafts, 'type');
    if (!aircraft) {
      console.error(`Invalid aircraft type: ${flight.aircraftType}`);
      return null;
    }

    const distance = this.getDistance(flight, airport);

    if (![distance, aircraft.runningCostPerSeatPer100km, aircraft.maxFlightRange, aircraft.totalSeats].every((val, idx) => this.validateParsedData(val, ['distance', 'running cost', 'max flight range', 'total seats'][idx]))) {
      return null;
    }

    if (distance > aircraft.maxFlightRange) {
      console.error(`Flight distance (${distance} km) exceeds maximum flight range of the aircraft (${aircraft.maxFlightRange} km).`);
      return null;
    }

    const totalBookedSeats = flight.seats.reduce((sum, seat) => sum + seat, 0);
    if (totalBookedSeats > aircraft.totalSeats) {
      console.error(`Overbooking error: ${totalBookedSeats} seats booked but aircraft only has ${aircraft.totalSeats} seats.`);
      return null;
    }

    const income = flight.seats.reduce((sum, seat, index) => sum + (seat * flight.prices[index]), 0);
    if (!this.validateParsedData(income, 'income')) return null;

    const costPerSeat = aircraft.runningCostPerSeatPer100km * (distance / 100);
    const totalCost = costPerSeat * totalBookedSeats;
    if (!this.validateParsedData(totalCost, 'total cost')) return null;

    const profit = income - totalCost;

    return {
      aircraftType: flight.aircraftType,
      income: income.toFixed(2),
      cost: totalCost.toFixed(2),
      profit: profit.toFixed(2)
    };
  }
}

// Function to process flight data
function processFlightData(flightsFile, airportsFile, aircraftsFile, outputFile, isValid = true) {
  const airports = readCsv(airportsFile).map(data => new Airport(...data));
  const aircrafts = readCsv(aircraftsFile).map(data => new Aircraft(...data));
  const flights = readCsv(flightsFile).map(data => new Flight(...data));

  if (!airports || !aircrafts || !flights) {
    console.error("Error: Could not load necessary data files.");
    return;
  }

  const calculator = new FlightProfitCalculator(airports, aircrafts);
  const results = flights.map(flight => calculator.calculateProfit(flight)).filter(result => result !== null);

  if (isValid && results.length > 0) {
    const outputContent = results.map(result => [
      result.aircraftType,
      `£${result.income}`,
      `£${result.cost}`,
      `£${result.profit}`
    ]);

    fs.writeFileSync(outputFile, JSON.stringify(outputContent, null, 2), { encoding: 'utf-8' });
    console.log(`Results written to ${outputFile}`);
  } else if (!isValid) {
    results.forEach(result => console.log("Valid flight: " + JSON.stringify(result)));
  }
}

// Usage example
processFlightData('valid_flight_data.csv', 'airports.csv', 'aeroplanes.csv', 'flight_results.txt');
processFlightData('invalid_flight_data.csv', 'airports.csv', 'aeroplanes.csv', null, false);