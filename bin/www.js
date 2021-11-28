#!/usr/bin/env node

import debugLib from 'debug'
import app from './app.js'

const debug = debugLib('www')
debug("Demarrer server5")

app()