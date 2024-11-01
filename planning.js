// Import required modules
const fs = require("fs");

// Function to read a CSV file and parse its content
function readCsv(filename, delimiter = ",") {
  try {
    const fileContent = fs.readFileSync(filename, { encoding: "utf-8" });
    return fileContent
      .split("\n") // Split the file content by new lines
      .slice(1) // Skip the header row
      .map((row) =>
        row
          .trim() // Trim whitespace from the row
          .split(delimiter) // Split the row by the delimiter
          .map((col) => col.trim()) // Trim whitespace from each column
      )
      .filter((row) => row.length > 1); // Filter out empty rows
  } catch (err) {
    console.error("Error reading file:", err.message);
    return null;
  }
}

// Class representing a Flight
class Flight {
  constructor(flightData) {
    const [
      ukAirport,
      overseasAirport,
      aircraftType,
      economySeats,
      businessSeats,
      firstClassSeats,
      economyPrice,
      businessPrice,
      firstClassPrice,
    ] = flightData;

    // Initialize flight properties
    this.ukAirport = ukAirport;
    this.overseasAirport = overseasAirport;
    this.aircraftType = aircraftType;
    this.economySeats = parseInt(economySeats);
    this.businessSeats = parseInt(businessSeats);
    this.firstClassSeats = parseInt(firstClassSeats);
    this.economyPrice = parseFloat(economyPrice);
    this.businessPrice = parseFloat(businessPrice);
    this.firstClassPrice = parseFloat(firstClassPrice);
  }
}

// Class to calculate flight profit and CO2 emissions
class FlightProfitCalculator {
  constructor(airports, aircrafts) {
    this.airports = airports;
    this.aircrafts = aircrafts;
  }

  // Find details of an item in a dataset by key
  findDetails(key, dataSet, keyIndex) {
    return dataSet.find(
      (item) => item[keyIndex].toUpperCase() === key.toUpperCase()
    );
  }

  // Calculate CO2 emissions for a flight
  calculateCO2Emissions(distance, totalSeats) {
    const co2PerSeatPerKm = 0.115; // CO2 emissions per seat per km in kg (example value)
    return (distance * totalSeats * co2PerSeatPerKm).toFixed(2);
  }

  // Calculate profit for a given flight
  calculateProfit(flight) {
    // Find the overseas airport details
    const airport = this.findDetails(flight.overseasAirport, this.airports, 0);
    if (!airport) {
      return {
        error: `Invalid overseas airport code: ${
          flight.overseasAirport
        }. Available codes: ${this.airports.map((a) => a[0]).join(", ")}`,
      };
    }

    // Find the aircraft details
    const aircraft = this.findDetails(flight.aircraftType, this.aircrafts, 0);
    if (!aircraft) {
      return {
        error: `Flight from ${flight.ukAirport} to ${
          flight.overseasAirport
        } by ${flight.aircraftType}: Invalid aircraft type: ${
          flight.aircraftType
        }. Available aircraft body: ${this.aircrafts
          .map((a) => a[0])
          .join(", ")}`,
      };
    }

    // Calculate the flight distance
    const distance =
      flight.ukAirport.toUpperCase() === "MAN"
        ? parseFloat(airport[2])
        : parseFloat(airport[3]);
    const runningCostPerSeatPer100km = parseFloat(
      aircraft[1].replace(/[^0-9.]/g, "")
    );
    const maxFlightRange = parseFloat(aircraft[2]);
    const economySeats = parseInt(aircraft[3]);
    const businessSeats = parseInt(aircraft[4]);
    const firstClassSeats = parseInt(aircraft[5]);
    const totalSeats = economySeats + businessSeats + firstClassSeats;

    // Check if the flight distance exceeds the aircraft's maximum range
    if (distance > maxFlightRange) {
      return {
        error: `Flight from ${flight.ukAirport} to ${flight.overseasAirport} by ${flight.aircraftType}: Flight distance (${distance} km) exceeds maximum flight range of the aircraft (${maxFlightRange} km).`,
      };
    }

    // Check if the aircraft has economy seats
    if (flight.economySeats > 0 && economySeats === 0) {
      return {
        error: `Flight from ${flight.ukAirport} to ${flight.overseasAirport} by ${flight.aircraftType}: ${flight.aircraftType} does not have economy seats.`,
      };
    }

    // Check if the aircraft has business seats
    if (flight.businessSeats > 0 && businessSeats === 0) {
      return {
        error: `Flight from ${flight.ukAirport} to ${flight.overseasAirport} by ${flight.aircraftType}: ${flight.aircraftType} does not have business seats.`,
      };
    }

    // Check if the aircraft has first-class seats
    if (flight.firstClassSeats > 0 && firstClassSeats === 0) {
      return {
        error: `Flight from ${flight.ukAirport} to ${flight.overseasAirport} by ${flight.aircraftType}: ${flight.aircraftType} does not have first-class seats.`,
      };
    }

    // Check for overbooking of economy class
    if (flight.economySeats > economySeats) {
      return {
        error: `Flight from ${flight.ukAirport} to ${flight.overseasAirport} by ${flight.aircraftType}: Overbooking error for economy class: ${flight.economySeats} seats booked but aircraft only has ${economySeats} economy seats.`,
      };
    }

    // Check for overbooking of business class
    if (flight.businessSeats > businessSeats) {
      return {
        error: `Flight from ${flight.ukAirport} to ${flight.overseasAirport} by ${flight.aircraftType}: Overbooking error for business class: ${flight.businessSeats} seats booked but aircraft only has ${businessSeats} business seats.`,
      };
    }

    // Check for overbooking of first-class
    if (flight.firstClassSeats > firstClassSeats) {
      return {
        error: `Flight from ${flight.ukAirport} to ${flight.overseasAirport} by ${flight.aircraftType}: Overbooking error for first class: ${flight.firstClassSeats} seats booked but aircraft only has ${firstClassSeats} first class seats.`,
      };
    }

    // Check for overbooking of total seats
    const totalBookedSeats =
      flight.economySeats + flight.businessSeats + flight.firstClassSeats;
    if (totalBookedSeats > totalSeats) {
      return {
        error: `Flight from ${flight.ukAirport} to ${flight.overseasAirport} by ${flight.aircraftType}: Overbooking error for total seats: ${totalBookedSeats} seats booked but aircraft only has ${totalSeats} total seats.`,
      };
    }

    // Calculate income from ticket sales
    const income =
      flight.economySeats * flight.economyPrice +
      flight.businessSeats * flight.businessPrice +
      flight.firstClassSeats * flight.firstClassPrice;

    // Calculate running cost
    const costPerSeat = runningCostPerSeatPer100km * (distance / 100);
    const totalCost =
      costPerSeat *
      (flight.economySeats + flight.businessSeats + flight.firstClassSeats);
    const profit = income - totalCost;
    const profitMargin = ((profit / income) * 100).toFixed(2);
    const co2Emissions = this.calculateCO2Emissions(
      distance,
      flight.economySeats + flight.businessSeats + flight.firstClassSeats
    );

    // Return the calculated flight details
    return {
      ukAirport: flight.ukAirport,
      overseasAirport: flight.overseasAirport,
      aircraftType: flight.aircraftType,
      income: income.toFixed(2),
      cost: totalCost.toFixed(2),
      profit: profit.toFixed(2),
      profitMargin,
      co2Emissions,
    };
  }
}

// Class to manage flight operations
class FlightManager {
  constructor(
    validFlightsFile,
    invalidFlightsFile,
    airportsFile,
    aircraftsFile
  ) {
    // Read flight, airport, and aircraft data from CSV files
    this.validFlights = readCsv(validFlightsFile) || [];
    this.invalidFlights = readCsv(invalidFlightsFile) || [];
    this.airports = readCsv(airportsFile) || [];
    this.aircrafts = readCsv(aircraftsFile) || [];
  }

  // Get user input for flight details
  async getUserInput() {
    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(
        "Enter the UK airport code (e.g., MAN or LGW): ",
        (ukAirport) => {
          // Validate the UK airport code
          if (
            ukAirport.toUpperCase() !== "MAN" &&
            ukAirport.toUpperCase() !== "LGW"
          ) {
            console.error(
              "Invalid UK airport code. Available codes are MAN, LGW."
            );
            rl.close();
            resolve(null);
            return;
          }

          rl.question(
            "Enter the overseas airport code: ",
            (overseasAirport) => {
              // Validate the overseas airport code
              const validOverseasAirports = ["JFK", "ORY", "MAD", "AMS", "CAI"];
              if (
                !validOverseasAirports.includes(overseasAirport.toUpperCase())
              ) {
                console.error(
                  `Invalid overseas airport code: ${overseasAirport}. Available codes: ${validOverseasAirports.join(
                    ", "
                  )}`
                );
                rl.close();
                resolve(null);
                return;
              }

              rl.question("Enter the aircraft type: ", (aircraftType) => {
                // Validate the aircraft type
                const validAircraftTypes = this.aircrafts.map((a) =>
                  a[0].toUpperCase()
                );
                if (!validAircraftTypes.includes(aircraftType.toUpperCase())) {
                  console.error(
                    `Invalid aircraft type: ${aircraftType}. Available aircraft body: ${validAircraftTypes.join(
                      ", "
                    )}`
                  );
                  rl.close();
                  resolve(null);
                  return;
                }

                rl.question("Enter the number of economy seats booked: ", (economySeats) => {
                  const parsedSeats = parseInt(economySeats.trim(), 10);
                  if (isNaN(parsedSeats) || parsedSeats < 0) {
                    console.error("Invalid input. Please enter a valid number of economy seats.");
                    rl.close();
                    resolve(null);
                    return;
                  }

                  // Resolve the user input
                  resolve({
                    ukAirport: ukAirport.toUpperCase(),
                    overseasAirport: overseasAirport.toUpperCase(),
                    aircraftType: aircraftType.toUpperCase(),
                    economySeats: parsedSeats,
                  });
                });
              });
            }
          );
        }
      );
    });
  }

  // Process a flight based on user input
  async processFlight() {
    const userInput = await this.getUserInput();
    if (!userInput) {
      console.error("User input is not defined.");
      return;
    }

    const calculator = new FlightProfitCalculator(
      this.airports,
      this.aircrafts
    );

    // Check if the flight is in both valid and invalid flights list
    const validFlightData = this.validFlights.find(
      (flight) =>
        flight[0].toUpperCase() === userInput.ukAirport.toUpperCase() &&
        flight[1].toUpperCase() === userInput.overseasAirport.toUpperCase() &&
        flight[2].toUpperCase() === userInput.aircraftType.toUpperCase()
    );

    const invalidFlightData = this.invalidFlights.find(
      (flight) =>
        flight[0].toUpperCase() === userInput.ukAirport.toUpperCase() &&
        flight[1].toUpperCase() === userInput.overseasAirport.toUpperCase() &&
        flight[2].toUpperCase() === userInput.aircraftType.toUpperCase()
    );

    // If flight data is found in both valid and invalid lists
    if (validFlightData && invalidFlightData) {
      // Update validFlightData with user-provided economy seats
      const updatedFlightData = [...validFlightData];
      updatedFlightData[3] = userInput.economySeats;

      const flight = new Flight(updatedFlightData);
      const result = calculator.calculateProfit(flight);

      if (result && result.error) {
        console.error(`Invalid Flight: ${result.error}`);
      } else if (result) {
        console.log(`Flight from ${result.ukAirport} to ${result.overseasAirport} using ${result.aircraftType}:
  Income: £${result.income}, Cost: £${result.cost}, Profit: £${result.profit}
  Profit Margin: ${result.profitMargin}%, CO2 Emissions: ${result.co2Emissions} kg`);
      }
      return;
    }

    // If flight is only in the valid flights list
    if (validFlightData) {
      // Update validFlightData with user-provided economy seats
      const updatedFlightData = [...validFlightData];
      updatedFlightData[3] = userInput.economySeats;

      const flight = new Flight(updatedFlightData);
      const result = calculator.calculateProfit(flight);

      if (result && result.error) {
        console.error(result.error);
      } else if (result) {
        console.log(`Flight from ${result.ukAirport} to ${result.overseasAirport} using ${result.aircraftType}:
  Income: £${result.income}, Cost: £${result.cost}, Profit: £${result.profit}
  Profit Margin: ${result.profitMargin}%, CO2 Emissions: ${result.co2Emissions} kg`);
      }
      return;
    }

    // If flight is only in the invalid flights list
    if (invalidFlightData) {
      const flight = new Flight(invalidFlightData);
      const result = calculator.calculateProfit(flight);

      if (result && result.error) {
        console.error(`Invalid Flight: ${result.error}`);
      } else {
        console.error(
          "This flight is marked as invalid, but no specific errors were found."
        );
      }
      return;
    }

    console.error("No matching flight found.");
  }
}

// Usage example
const flightManager = new FlightManager(
  "valid_flight_data.csv",
  "invalid_flight_data.csv",
  "airports.csv",
  "aeroplanes.csv"
);
flightManager.processFlight();
