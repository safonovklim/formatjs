import {join, sep} from 'path';
import * as fs from 'fs';
import {transformFileSync} from '@babel/core';
import plugin from '../src';

function trim(str?: string | null) {
  return String(str).replace(/^\s+|\s+$/, '');
}

const skipOutputTests = [
  '.babelrc',
  '.DS_Store',
  'enforceDescriptions',
  'enforceDefaultMessage',
  'extractSourceLocation',
  'extractFromFormatMessageCall',
  'moduleSourceName',
  'icuSyntax',
  'removeDescriptions',
  'overrideMessageFn',
  'removeDefaultMessage',
  'additionalComponentNames',
];

const fixturesDir = join(__dirname, 'fixtures');
const baseDir = join(__dirname, '..');

describe('emit asserts for: ', () => {
  fs.readdirSync(fixturesDir).map(caseName => {
    if (skipOutputTests.indexOf(caseName) >= 0) return;

    it(`output match: ${caseName}`, () => {
      const fixtureDir = join(fixturesDir, caseName);

      // Ensure messages are deleted
      const actualMessagesPath = join(fixtureDir, 'actual.json');
      if (fs.existsSync(actualMessagesPath)) fs.unlinkSync(actualMessagesPath);

      const {code: actual, metadata} = transform(
        join(fixtureDir, 'actual.js')
      )!;
      expect((metadata as any)['react-intl']).toMatchSnapshot();
      // Check code output
      expect(trim(actual)).toMatchSnapshot();

      // Check message output
      expect(require(join(fixtureDir, 'actual.json'))).toMatchSnapshot();
    });
  });
});

describe('options', () => {
  it('removeDefaultMessage should remove default message', () => {
    const fixtureDir = join(fixturesDir, 'removeDefaultMessage');

    const actual = transform(join(fixtureDir, 'actual.js'), {
      removeDefaultMessage: true,
    })!.code;

    // Check code output
    expect(trim(actual)).toMatchSnapshot();

    // Check message output
    expect(require(join(fixtureDir, 'actual.json'))).toMatchSnapshot();
  });
  it('enforces descriptions when enforceDescriptions=true', () => {
    const fixtureDir = join(fixturesDir, 'enforceDescriptions');
    expect(() =>
      transform(join(fixtureDir, 'actual.js'), {
        enforceDescriptions: true,
      })
    ).toThrow(/Message must have a `description`/);
  });

  it('correctly overrides the id and/or defaultMessage when overrideMessageFn is provided', () => {
    const fixtureDir = join(fixturesDir, 'overrideMessageFn');

    const actual = transform(join(fixtureDir, 'actual.js'), {
      overrideMessageFn: (
        id: string,
        defaultMessage: string,
        description: string
      ) => {
        return {
          id: `HELLO.${id}.${defaultMessage.length}.${typeof description}`,
          SUPER_DEFAULT_MESSAGE: defaultMessage,
          defaultMessage: `bye ${defaultMessage}`,
        };
      },
    })!.code;

    // Check code output
    expect(trim(actual)).toMatchSnapshot();

    // Check message output
    expect(require(join(fixtureDir, 'actual.json'))).toMatchSnapshot();
  });

  it('allows no description when enforceDescription=false', () => {
    const fixtureDir = join(fixturesDir, 'enforceDescriptions');
    expect(() =>
      transform(join(fixtureDir, 'actual.js'), {
        enforceDescriptions: false,
      })
    ).not.toThrow();
  });

  it('allows no description when enforceDefaultMessage=false', () => {
    const fixtureDir = join(fixturesDir, 'enforceDefaultMessage');
    expect(() =>
      transform(join(fixtureDir, 'actual.js'), {
        enforceDefaultMessage: false,
      })
    ).not.toThrow();

    // Check message output
    expect(require(join(fixtureDir, 'actual.json'))).toMatchSnapshot();
  });

  it('removes descriptions when plugin is applied more than once', () => {
    const fixtureDir = join(fixturesDir, 'removeDescriptions');
    expect(() =>
      transform(
        join(fixtureDir, 'actual.js'),
        {
          enforceDescriptions: true,
        },
        {
          multiplePasses: true,
        }
      )
    ).not.toThrow();
  });

  it('respects moduleSourceName', () => {
    const fixtureDir = join(fixturesDir, 'moduleSourceName');
    expect(() =>
      transform(join(fixtureDir, 'actual.js'), {
        moduleSourceName: 'react-i18n',
      })
    ).not.toThrow();

    // Check message output
    expect(require(join(fixtureDir, 'actual.json'))).toMatchSnapshot();
  });

  it('respects extractSourceLocation', () => {
    const fixtureDir = join(fixturesDir, 'extractSourceLocation');
    expect(() =>
      transform(join(fixtureDir, 'actual.js'), {
        extractSourceLocation: true,
      })
    ).not.toThrow();

    // Check message output
    const actualMessages = require(join(fixtureDir, 'actual.json'));
    actualMessages.forEach((msg: any) => {
      msg.file = msg.file.replace(/\/|\\/g, '@@sep@@');
    });
    expect(actualMessages).toMatchSnapshot();
  });

  it('respects extractFromFormatMessageCall', () => {
    const fixtureDir = join(fixturesDir, 'extractFromFormatMessageCall');
    expect(() =>
      transform(join(fixtureDir, 'actual.js'), {
        extractFromFormatMessageCall: true,
      })
    ).not.toThrow();

    // Check message output
    expect(require(join(fixtureDir, 'actual.json'))).toMatchSnapshot();
  });

  it('additionalComponentNames', () => {
    const fixtureDir = join(fixturesDir, 'additionalComponentNames');
    expect(() =>
      transform(join(fixtureDir, 'actual.js'), {
        additionalComponentNames: ['CustomMessage'],
      })
    ).not.toThrow();

    // Check message output
    expect(require(join(fixtureDir, 'actual.json'))).toMatchSnapshot();
  });
});

describe('errors', () => {
  it('Properly throws parse errors', () => {
    const fixtureDir = join(fixturesDir, 'icuSyntax');
    expect(() => transform(join(fixtureDir, 'actual.js'))).toThrow(
      /Expected .* but "\." found/
    );
  });
});

const BASE_OPTIONS = {
  messagesDir: baseDir,
};

let cacheBust = 1;

function transform(
  filePath: string,
  options = {},
  {multiplePasses = false} = {}
) {
  function getPluginConfig() {
    return [
      plugin,
      {
        ...BASE_OPTIONS,
        ...options,
      },
      Date.now() + '' + ++cacheBust,
    ];
  }

  return transformFileSync(filePath, {
    plugins: multiplePasses
      ? [getPluginConfig(), getPluginConfig()]
      : [getPluginConfig()],
  });
}
