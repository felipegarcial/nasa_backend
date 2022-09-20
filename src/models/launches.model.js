const axios = require('axios');

const launchesDatabase = require('./launches.model.mongo');
const planets = require('./planets.model.mongo');

const DEFAULT_FLIGHT_NUMBER = 100;
const SPACEX_API_URL = 'https://api.spacexdata.com/v4/launches/query';


const populateLaunches = async () => {
    const response = await axios.post(SPACEX_API_URL, {
        query: {},
        options: {
            pagination: false,
            populate: [
                {
                    path:'rocket',
                    select: {
                        name: 1
                    }
                },
                {
                    path:'payloads',
                    select: {
                        customers: 1
                    }
                }
            ]
        }
    });

    if (response.status !== 200) {
        console.log('Problem downloading launch data');
        throw new Error('Launch data download failed');
    }

    const launchDocs = response.data.docs;

    for (const launchDoc of launchDocs) {
        const payloads = launchDoc['payloads'];

        const customers = payloads.flatMap((payload) => {
          return payload['customers'];
        });
    
        const launch = {
          flightNumber: launchDoc['flight_number'],
          mission: launchDoc['name'],
          rocket: launchDoc['rocket']['name'],
          launchDate: launchDoc['date_local'],
          upcoming: launchDoc['upcoming'],
          success: launchDoc['success'],
          customers,
        };
    
        console.log(`${launch.flightNumber} ${launch.mission}`);
    
        await saveLaunch(launch);
    }
}
const findLaunch = async (filter) => {
    return await launchesDatabase.findOne(filter);
}

const existLaunchWithId = async (launchId) => {
    return await findLaunch({
        flightNumber:launchId
    });
}

const getAllLaunches = (skip,limit) => {
    return launchesDatabase
        .find({},{'_id': 0, '__v': 0})
        .sort({flightNumber: 1})
        .skip(skip)
        .limit(limit)
}

const getLatestFlightNumber = async () => {
    const latestLaunch = await launchesDatabase
        .findOne({})
        .sort('-flightNumber');

    if(!latestLaunch){
        return DEFAULT_FLIGHT_NUMBER;
    }

    return latestLaunch.flightNumber;
}

const saveLaunch = async (launch) => {
    const isTargetPlanet = planets.findOne({
        keplerName: launch.target
    });

    if(!isTargetPlanet) {
        throw new Error ('No matching planet found');
    }

    return await launchesDatabase.findOneAndUpdate({
        flightNumber: launch.flightNumber
    },
    launch,
    {
        upsert:true
    })
}

const scheduleNewLaunch = async (launch) => {
    const newFlightNumber = await getLatestFlightNumber() + 1;

    const newLaunch =  Object.assign(launch, {
        success: true,
        upcoming: true,
        customers: ['ZTM', 'NASA'],
        flightNumber: newFlightNumber,
    });

    await saveLaunch(newLaunch);
};

const abortLaunchById = async (launchId) => {
    const aborted = await launchesDatabase.updateOne({
        flightNumber: launchId,
    }, {
        upcoming: false,
        success: false,
    });

    return aborted.modifiedCount === 1;
}

const loadLaunchesData = async () => {
    const firstLunch = await findLaunch({
        flightNumber: 1,
        rocket: 'Falcon 1',
        mission: 'FalconSat'
    }); 

    if(firstLunch){
        console.log('Launch data already loded');
    }else {
        await populateLaunches();
    }
}

module.exports = {
    existLaunchWithId,
    getAllLaunches,
    scheduleNewLaunch,
    abortLaunchById,
    loadLaunchesData
}