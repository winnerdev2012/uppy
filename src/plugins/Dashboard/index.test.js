const Core = require('../../core')
const DashboardPlugin = require('./index')
const StatusBarPlugin = require('../StatusBar')

describe('Dashboard', () => {
  it('can safely be added together with the StatusBar without id conflicts', () => {
    const core = new Core()
    core.use(StatusBarPlugin)

    expect(() => {
      core.use(DashboardPlugin, { inline: false })
    }).not.toThrow()
  })
})
