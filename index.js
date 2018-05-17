/**
 * Copyright (c) 2018, The Monero Messaging System Developers
 *
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors
 * may be used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

require('dotenv').config()

const debug = require('debug')('mmsd:core')
const jayson = require('jayson')
const pkg = require('./package.json')
const xmlrpc = require('xmlrpc')

const BITMESSAGE_HOST = process.env.MMS_BITMESSAGE_HOST
const BITMESSAGE_PORT = process.env.MMS_BITMESSAGE_PORT
const BITMESSAGE_USER = process.env.MMS_BITMESSAGE_USER
const BITMESSAGE_PASS = process.env.MMS_BITMESSAGE_PASS
const RPC_PORT = process.env.MMS_RPC_PORT

if (!BITMESSAGE_HOST ||
    !BITMESSAGE_PORT ||
    !BITMESSAGE_USER ||
    !BITMESSAGE_PASS ||
    !RPC_PORT) {
  console.err('Incomplete configuration. Quitting')
  process.exit(-1)
}

const bitmessage = xmlrpc.createClient({
  host: BITMESSAGE_HOST,
  port: BITMESSAGE_PORT,
  path: '/',
  basic_auth: {
    user: BITMESSAGE_USER,
    pass: BITMESSAGE_PASS
  }
})

const server = jayson.server({
  status (args, cb) {
    bitmessage.methodCall('clientStatus', [], (err, response) => {
      if (err) {
        debug('Failed to get BitMessage status')
        return cb({ code: -1, message: 'BitMessage daemon offline' })
      }

      response = JSON.parse(response)

      cb(null, {
        mmsd: {
          name: pkg.name,
          version: pkg.version
        },
        transport: {
          name: response.softwareName,
          version: response.softwareVersion,
          status: response.networkStatus,
          connections: response.networkConnections
        }
      })
    })
  },
  getMessages (args, cb) {
    return cb({ code: -1, message: 'Method not implemented' })
  },
  confirmMessageReceived (args, cb) {
    if (!args.messageId) return cb({ code: -1, message: 'Message id not specified' })

    debug('Deleting message with id "%s"', args.messageId)

    bitmessage.methodCall('trashMessage', [args.messageId], (err, response) => {
      return err ? cb(err) : cb(null)
    })
  }
})

module.exports = server

if (!module.parent) {
  server.http().listen(RPC_PORT, () => console.log(`Listening on :${RPC_PORT}`))
}
