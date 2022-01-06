#!/bin/sh

checkConfigFile () {
    # check if config file exist
    if [ ! -f /cfg-data/config.json ]; then
        echo "No config file found. Restarting in 30 seconds.."
        sleep 30
        checkConfigFile
    else
        return 1
    fi
}

# check if config file exist, if not wait 30 seconds and try again
checkConfigFile

# start
node app.js

# DEBUG
#tail -f /dev/null