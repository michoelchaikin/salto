import { createCommandBuilder, YargsCommandBuilder } from '../../src/command_builder'
import { CliExitCode } from '../../src/types'
import { MockCliOutput, mockLoadConfig, cli } from '../mocks'
import { servicesFilter } from '../../src/filters/services'

jest.mock('salto', () => ({
  ...require.requireActual('salto'),
  loadConfig: jest.fn().mockImplementation((workspaceDir: string) => mockLoadConfig(workspaceDir)),
}))

describe('services filter', () => {
  let out: MockCliOutput
  let buildFunc: jest.Mock
  let builder: YargsCommandBuilder

  beforeEach(async () => {
    buildFunc = jest.fn(() =>
      Promise.resolve({ execute: () => Promise.resolve(CliExitCode.Success) })) as jest.Mock

    builder = createCommandBuilder({
      options: {
        command: 'testCommand',
        aliases: ['t'],
        description: 'tests the command parser',
        keyed: {
          'test-opt': {
            boolean: true,
            demandOption: true,
          },
        },
      },

      filters: [servicesFilter],

      build: buildFunc,
    })
  })

  const runCli = (args: string): Promise<MockCliOutput> =>
    cli({
      commandBuilders: [builder] as YargsCommandBuilder[],
      args,
    })

  describe('yargs configuration', () => {
    it('does not override the original options', async () => {
      out = await runCli('t .') // existing option 'test-opt' not specified
      expect(out.err).toMatch(/\bMissing required argument: test-opt\b/)
    })

    it('Shows the help option', async () => {
      expect(out.err).toMatch(/--help\b/)
    })
  })

  describe('command builder', () => {
    describe('when services option is not used', () => {
      beforeEach(async () => {
        await runCli('t --test-opt')
      })

      it('services should be workspace services', () => {
        expect(buildFunc.mock.calls[0][0]).toEqual(
          expect.objectContaining({
            args: {
              $0: 'salto',
              _: ['t'],
              services: ['salesforce', 'hubspot'],
              'test-opt': true,
              testOpt: true,
            },
          })
        )
      })
    })

    describe('when called with a service that exists', () => {
      beforeEach(async () => {
        await runCli('t --test-opt -s salesforce')
      })

      it('services should be inputted services', () => {
        expect(buildFunc.mock.calls[0][0]).toEqual(
          expect.objectContaining({
            args:
            {
              $0: 'salto',
              _: ['t'],
              s: ['salesforce'],
              services: ['salesforce'],
              'test-opt': true,
              testOpt: true,
            },
          })
        )
      })
    })

    describe('when called with a service that is not configured', () => {
      beforeEach(async () => {
        out = await runCli('t --test-opt -s abcdefg')
      })

      it('should fail with service not configured error', async () => {
        expect(out.err).toMatch('Not all services (abcdefg) are set up for this workspace')
      })
    })
  })
})