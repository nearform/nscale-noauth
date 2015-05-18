/*
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESSED OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
 * IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

var fs = require('fs');
var _ = require('lodash');
var uuid = require('uuid');
var osenv = require('osenv');
var path = require('path');
var CREDENTIALS_FILE = 'credentials.json';
var ini = require('ini');


module.exports = function(options) {
  var credentialsPath = path.join(options.credentialsPath, CREDENTIALS_FILE);

  var readCredentials = function(cb) {
    fs.exists(credentialsPath, function(exists) {
      if (exists) {
        fs.readFile(credentialsPath, 'utf8', function(err, data) {
          if (err) { return cb(err); }
          cb(null, JSON.parse(data));
        });
      }
      else {
        cb(null, {});
      }
    });
  };



  var saveCredentials = function(user, cb) {
    readCredentials(function(err, users) {
      if (err) { return cb(err); }

      var exists = _.find(users, function(u) { return u.email === user.email; });
      if (exists) {
        user.token = exists.token;
        cb(null, user);
      }
      else {
        users[user.token] = user;
        fs.writeFile(credentialsPath, JSON.stringify(users, null, 2), 'utf8', function(err) {
          cb(err, user);
        });
      }
    });
  };



  /**
   * get user credentials from ~/.gitconfig
   * and store against generated token
   * no authentication performed - ignores username and password
   */
  var login = function(username, password, cb) {
    var gitConfigPath = path.join(osenv.home(), '.gitconfig');
    var user = {};
    var error = gitConfigPath + ' not found, please configure git on this system';

    fs.readFile(gitConfigPath, 'utf8', function(err, data) {
      if (err) { return cb(err); }

      data = ini.decode(data.toString());

      Object.keys(data.user).forEach(function(key) {
        user[key] = data.user[key];
      });

      if (user.email && user.name) {
        error = null;
        user.token = uuid.v4();
        saveCredentials(user, function(err, u) {
          cb(err, {user: u});
        });
      }
      else {
        cb(error, null);
      }
    });
  };




  /**
   * get user information from token
   */
  var userInfo = function(token, cb) {
    readCredentials(function(err, users) {
      if (err) { return cb(err); }
      cb(null, users[token]);
    });
  };



  return {
    login: login,
    userInfo: userInfo
  };
};
