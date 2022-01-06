'use strict'

import autoBind from 'auto-bind';
import * as mqtt from "async-mqtt";


class mqttHandler {
    constructor(config, clientId) {

        // set some properties
        this.mqtt = null;
        this.handlers = [];
        this.handlersNum = 0;
        this.handlersNames = [];
        this.handlersTopics = [];
        this.connected = false;

        // set connection parameters
        this.brokerhost = "tcp://" + config.brokerAddress + ":" + config.brokerPort;
        this.config =
        {
            keepalive: 10000,
            clientId: clientId,
            username: config.username,
            password: config.password
        };
        // set metadata topic
        this.metadataTopic = config.metadataTopic;
        //this.dataTopic = config.dataTopic;
        // set publish root topic
        this.publishTopic = config.publishTopic;
        // set publish time
        this.publishTime = config.publishTimeMs;

        // link functions to this class
        autoBind(this);
    }

    initHandler(name, datapoints) {
        // create an handler based on metadata properties

        // init handler and some props
        let handler = {};
        handler.deviceName = name;
        handler.dataTopic = datapoints.topic;
        handler.publishTopic = this.publishTopic + "/" + name + "/default";
        handler.datapoints = {};
        handler.datapointsNames = [];
        handler.idNameMap = new Map();
        handler.seqNum = 0;
        handler.dataReceived = false;

        for (let i = 0; i < datapoints.dataPointDefinitions.length; i++) {
            // get each datapoint of the connection
            let datapoint = datapoints.dataPointDefinitions[i];
            // initialize value based on datatype
            let initVal = datapoint.dataType == 'String' ? "" : (datapoint.dataType == 'Bool' ? false : 0)

            // update handler props
            handler.datapointsNames.push(datapoint.name);
            handler.datapoints[datapoint.name] = {
                "name": datapoint.name,
                "id": datapoint.id,
                "dataType": datapoint.dataType,
                "value": initVal
            };
            // update handler map
            handler.idNameMap.set(datapoint.id, datapoint.name);
        }

        console.log("Created datasource handler " +
            name + " with " +
            handler.datapointsNames.length + " datapoint" +
            (handler.datapointsNames.length > 1 ? "s" : "") +
            " on topic " + handler.publishTopic);

        return handler
    }

    async createHandlers(connections) {
        // create handlers for each datasource based on metadata connections

        // reset actual handlers
        this.handlers = [];
        this.handlersNames = [];
        this.handlersTopics = [];
        this.handlersNum = 0;

        // for each connection create an handler
        for (let i = 0; i < connections.length; i++) {
            this.handlers.push(this.initHandler(connections[i].name, connections[i].dataPoints[0]));
            this.handlersNum += 1;
            this.handlersNames.push(connections[i].name);
            this.handlersTopics.push(this.handlers[i].dataTopic);
            // subscribe to handler data topic
            await this.mqtt.subscribe(this.handlers[i].dataTopic);
        }

        return;
    }

    getHandlerIndexFromTopic(topic) {
        // return handler index based on data topic

        // get the name of the datasource from topic
        //let datasourceTopic = topic.replace(this.dataTopic + "/", "").replace("/default", "");
        let handlerIndex = null;

        for (let i = 0; i < this.handlersTopics.length; i++) {
            // search for same name in handlers list
            if (this.handlersTopics[i] == topic) {
                handlerIndex = i;
                break;
            }
        }

        return handlerIndex;
    }

    updateHandler(handlerIndex, vals) {
        // update handlers with new values

        this.handlers[handlerIndex].dataReceived = true;

        for (let i = 0; i < vals.length; i++) {

            // get current name of datapoint
            let currName = this.handlers[handlerIndex].idNameMap.get(vals[i].id);
            // if datapoint is in handler
            if (this.handlers[handlerIndex].datapointsNames.includes(currName)) {

                // format the value based on datatype
                let dataType = this.handlers[handlerIndex].datapoints[currName].dataType;
                let newValue = vals[i].val;
                if (dataType == 'Bool') {
                    newValue = Boolean(vals[i].val);
                }
                else if (dataType == 'String') {
                    newValue = vals[i].val.toString();
                }

                // update value
                this.handlers[handlerIndex].datapoints[currName].value = newValue;
            }
        }
    }

    async sendMessage(names, datapoints, topic, seqNum) {
        // method for publish datapoints to mqtt

        try {
            // define base message
            let message = {
                "seq": seqNum,
                "vals": []
            }

            // get timestamp
            let ts = new Date().toISOString();

            // push each datapoint in the message
            for (let i = 0; i < names.length; i++) {

                // format the value based on datatype
                let newValue = datapoints[names[i]].value;
                if (datapoints[names[i]].dataType == 'Bool') {
                    newValue = newValue ? 1 : 0;
                }
                else if (datapoints[names[i]].dataType == 'String') {
                    newValue = newValue.toString();
                }
                message.vals.push(
                    {
                        "name": names[i],
                        "id": datapoints[names[i]].id,
                        "val": newValue,
                        "ts": ts
                    });
            }
            // send message to MQTT Broker
            await (this.mqtt.publish(topic, JSON.stringify(message)));
        }
        catch (e) {
            console.log(e);
        }
    }

    startLoop() {
        // the loop function started after connection
        // loop cycle time is defined by publishTimeMs parameter in configuration

        // for each mqtt datasource handler
        for (let i = 0; i < this.handlers.length; i++) {
            let handler = this.handlers[i];

            if (handler.dataReceived) {
                // send last datapoints
                this.sendMessage(handler.datapointsNames, handler.datapoints, handler.publishTopic, handler.seqNum);
                // increment publish sequential number
                this.handlers[i].seqNum += 1;
            }
        }
        // create loop by calling again this function after defined publish time
        setTimeout(this.startLoop, this.publishTime);
    }

    startListen() {
        // create receiver function for "message" events after client subscription
        // based on received messages, create mqtt datasource handlers or update values in datasource handlers

        var self = this;

        return new Promise(function (res, err) {

            // when mqtt client receives a message
            self.mqtt.on('message', function (topic, message) {
                //decode message
                let msg = JSON.parse(message.toString('utf-8'));

                // check topic
                if (topic == self.metadataTopic) {
                    // if metadata message is received, update data handlers
                    self.createHandlers(msg.connections);
                }
                else if (self.handlersTopics.includes(topic) && msg.hasOwnProperty('seq')) {
                    // based on the name of the datasource contained in the topic get the handler index
                    let handlerIndex = self.getHandlerIndexFromTopic(topic);

                    if (handlerIndex != null) {
                        // if data message is received, update values for the specific handler
                        self.updateHandler(handlerIndex, msg.vals);
                    }
                }
            });
            return res()
        });
    }

    clientSubscribe() {
        // subscribe to metadata topic

        let self = this;

        let PromiseHandlers = [];
        PromiseHandlers.push(this.mqtt.subscribe(this.metadataTopic));
        //PromiseHandlers.push(this.mqtt.subscribe(this.dataTopic));

        return new Promise(function (res, err) {
            Promise.all(PromiseHandlers)
                .then((results) => {
                    console.log("Subscribed to metadata topic " + self.metadataTopic);
                    return res(results);
                })
                .catch((e) => {
                    console.log(e);
                    return err(e);
                });
        });
    }

    start() {
        // the main function that initialize the MQTT Client
        // connect, subscribe to metadata and start listen messages

        var self = this;

        return new Promise(function (res, err) {

            try {
                // connect mqtt
                self.mqtt = mqtt.connect(self.brokerhost, self.config);

                // exit if not connected
                setTimeout(function () {
                    if (!self.connected) {
                        throw new Error('MQTT Client ' + self.brokerhost + ' not Connected!');
                    }
                }, 10000);

                // return promise on connected
                let PromiseHandlers = [];
                self.mqtt.on('connect', function () {
                    console.log('Connected to ' + self.brokerhost + ' successfully');
                    self.connected = true;
                    // subscribe to metadata
                    PromiseHandlers.push(self.clientSubscribe());
                    // start listen to metadata and data topic
                    PromiseHandlers.push(self.startListen());

                    Promise.all(PromiseHandlers).then(function () { return res(); });
                });
            }
            catch (e) {
                return err(e);
            }
        });
    }
}


export { mqttHandler }