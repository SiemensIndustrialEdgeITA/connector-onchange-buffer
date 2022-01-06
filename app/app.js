'use strict';

// import libs
import * as fs from 'fs'

// MQTT Client import
import { mqttHandler } from './mqtt-client.js';

// define config path
const appConfigPath = "/cfg-data/config.json";


// read config file from path
function readConfig(configPath) {
	return new Promise(function (res, err) {
		fs.readFile(configPath, (error, data) => {
			if (error) return err(error);
			return res(JSON.parse(data));
		});
	});
}

// initialize and start MQTT Client
async function Start() {
	try {
		var appConfig = await readConfig(appConfigPath);
		// Create MQTT Handlers
		var mqttClient = new mqttHandler(appConfig, 'conn-onchg-buf-client');
		// Connect and subscribe
		await mqttClient.start();

		if (mqttClient.connected) {
			console.log("Start Publish Loop on " + appConfig.publishTopic);
			// start the mqtt publish loop
			mqttClient.startLoop();
		}
	}
	catch (e) {
		console.log(e);
	}
};

//________MAIN________//
Start();