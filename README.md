# Connector OnChange Buffer for Industrial Edge Connector Apps

- [Connector OnChange Buffer for Industrial Edge Connector Apps](#connector-onchange-buffer-for-industrial-edge-connector-apps)
  - [Description](#description)
  - [Requirements](#requirements)
    - [Used components](#used-components)
    - [Hardware Requirements](#hardware-requirements)
    - [Software requirements](#software-requirements)
  - [Installation](#installation)
    - [Download the application](#download-the-application)
    - [Import an application in .app format](#import-an-application-in-app-format)
    - [Create a new standalone application](#create-a-new-standalone-application)
    - [Upload the application to Industrial Edge Management](#upload-the-application-to-industrial-edge-management)
      - [Link your Industrial Edge App Publisher](#link-your-industrial-edge-app-publisher)
      - [Import a standalone application into Industrial Edge Management](#import-a-standalone-application-into-industrial-edge-management)
  - [Configuration](#configuration)
  - [Usage](#usage)
  - [Documentation](#documentation)
  - [Contribution](#contribution)
  - [License & Legal Information](#license--legal-information)

## Description

When a Connector App is configured in "On Change" Mode, it will publish only the changed data and not the complete data structure.
This app can be connected to a metadata topic of a Connector App, get the configured datasources and the datapoints. buffer the relative data and publish the new data structure with all latest data to another defined topic.

## Requirements

### Used components

- OS: Windows or Linux
- Docker minimum V18.09
- Docker Compose V2.0 - V2.4
- Industrial Edge App Publisher (IEAP) V1.3.7
- Industrial Edge Management (IEM) V1.4.3
- Industrial Edge Device (IED) V1.3.0-57

### Hardware Requirements

The application is only compatible with SIEMENS devices that have Industrial Edge functionality enabled.

### Software requirements

The application needs 300 MB of RAM to run so divided among the used services:

| Service Name              | Memory Limit |
| ------------------------- | ------------ |
| connector-onchange-buffer | 300 MB       |

> **Note:** This limit has been set for an average volume of data read by Grafana and to ensure a constant usage over several datapoints, but can be modified according to your needs by acting on the docker-compose file and then on the app configuration in the Edge App Publisher software, creating a custom version of this application.

## Installation

Below you will find the steps required to download the pre-compiled app or to create and install an edge app from the source code provided here.

You can either import a directly downloadable .app file below, or use the provided source code to build a new app from scratch.

Please refer to the [Documentation](#documentation) section for detailed information on Industrial Edge application development.

### Download the application

The **edge-grafana** application can be downloaded in .app format using this secure Google Drive link:

- [connector-onchange-buffer_0.0.3.app](https://drive.google.com/file/d/1sA9MpJRZfr-lhlWekrsixlJxFAxwb56U/view?usp=sharing)

### Import an application in .app format

- Open the **Industrial Edge App Publisher** software
- Import the `connector-onchange-buffer_0.0.3.app` file using the **Import** button
- The new imported application will appear in the **Standalone Applications** section

### Create a new standalone application

- Open the **Industrial Edge App Publisher** software
- Go to the **Standalone Applications** section and create a new application
- Import the [docker-compose](docker-compose.yml) file using the **Import YAML** button
- Click on **Review** and then on **Validate & Create**.

### Upload the application to Industrial Edge Management

Below is a brief description on how to publish your application to your IEM.

For more detailed information please see the official Industrial Edge GitHub guide to [uploading apps to the IEM](https://github.com/industrial-edge/upload-app-to-industrial-edge-management) and the [Documentation](#documentation) section.

#### Link your Industrial Edge App Publisher

- Connect your Industrial Edge App Publisher to your **Docker Engine**
- Connect your Industrial Edge App Publisher to your **Industrial Edge Management**

#### Import a standalone application into Industrial Edge Management

- Create a new **Apps project** in the connected IEM or select an existing one
- Import the app version created in the **Standalone Applications** section into the selected IEM project
- Press **Start Upload** to transfer the application into Industrial Edge Management

## Configuration

To configure this app, use the [config.json](cfg-data/config.json) file deployed togheter with the app.
Below an example of the configuration file:

```json
{
  "brokerAddress": "ie-databus",
  "brokerPort": "1883",
  "username": "edge",
  "password": "edge",
  "metadataTopic": "ie/m/j/simatic/v1/s7c1/dp",
  "publishTopic": "ie/d/j/buffer/v1/s7c1/dp/r",
  "publishTimeMs": 1000
}
```

## Usage

The data will be published to the topic `<publishTopic>/<datasourceName>/default`every `publishTimeMs` milliseconds.

For example, based on the configuration above, the data received for datasource named **plc1** on topic **ie/d/j/simatic/v1/s7c1/dp/r/plc1/default** from S7 Connector App will be published to the topic **ie/d/j/buffer/v1/s7c1/dp/r/plc1/default** every 1000 milliseconds.

Example metadata:

```json
{
  "topic": "ie/m/j/simatic/v1/s7c1/dp",
  "payload": {
    "seq": 1,
    "connections": [
      {
        "name": "plc1",
        "type": "S7+",
        "dataPoints": [
          {
            "name": "default",
            "topic": "ie/d/j/simatic/v1/s7c1/dp/r/plc1/default",
            "publishType": "bulk",
            "dataPointDefinitions": [
              {
                "name": "motorCurrent",
                "id": "101",
                "dataType": "DInt"
              },
              {
                "name": "motorTorque",
                "id": "102",
                "dataType": "DInt"
              },
              {
                "name": "motorEnabled",
                "id": "103",
                "dataType": "Bool"
              }
            ]
          }
        ]
      },
      {
        "name": "plc2",
        "type": "S7+",
        "dataPoints": [
          {
            "name": "default",
            "topic": "ie/d/j/simatic/v1/s7c1/dp/r/plc2/default",
            "publishType": "bulk",
            "dataPointDefinitions": [
              {
                "name": "valveOpen",
                "id": "201",
                "dataType": "Bool"
              },
              {
                "name": "flowSpeed",
                "id": "202",
                "dataType": "Float"
              }
            ]
          }
        ]
      }
    ]
  },
  "qos": 0,
  "retain": true
}
```

Example data of plc1 datasource from S7 Connector with onchange mode:

```json
{
  "topic": "ie/d/j/simatic/v1/s7c1/dp/r/plc1/default",
  "payload": {
    "seq": 730117,
    "vals": [
      {
        "id": "102",
        "qc": 3,
        "ts": "2022-01-05T13:40:28.482Z",
        "val": 213.90432818014432
      },
      {
        "id": "103",
        "qc": 3,
        "ts": "2022-01-05T13:40:28.482Z",
        "val": false
      }
    ]
  },
  "qos": 0,
  "retain": false
}
```

Example data of plc1 datasource from Connector OnChange Buffer App:

```json
{
  "topic": "ie/d/j/buffer/v1/s7c1/dp/r/plc1/default",
  "payload": {
    "seq": 71,
    "vals": [
      {
        "name": "motorCurrent",
        "val": 96.8632780674959,
        "ts": "2022-01-05T13:40:29.127Z"
      },
      {
        "name": "motorTorque",
        "val": 213.90432818014432,
        "ts": "2022-01-05T13:40:29.127Z"
      },
      {
        "name": "motorEnabled",
        "val": 0,
        "ts": "2022-01-05T13:40:29.127Z"
      }
    ]
  },
  "qos": 0,
  "retain": false
}
```

## Documentation

You can find further documentation and help about Industrial Edge in the following links:

- [Industrial Edge Hub](https://iehub.eu1.edge.siemens.cloud/#/documentation)
- [Industrial Edge Forum](https://www.siemens.com/industrial-edge-forum)
- [Industrial Edge landing page](https://new.siemens.com/global/en/products/automation/topic-areas/industrial-edge/simatic-edge.html)
- [Industrial Edge GitHub page](https://github.com/industrial-edge)
- [Industrial Edge App Developer Guide](https://support.industry.siemens.com/cs/ww/en/view/109795865)

## Contribution

Thanks for your interest in contributing. Anybody is free to report bugs, unclear documentation, and other problems regarding this repository in the Issues section or, even better, is free to propose any changes to this repository using Merge Requests.

## License & Legal Information

Please read the [Legal Information](LICENSE.md).
