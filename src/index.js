import './polyfills';

import traverse from '@babel/traverse';
import omitDeep from 'omit-deep-lodash';
import deepEqual from 'deep-equal';

// import preprocess from './preprocess';
import parse from './parse';

export default (text, { pattern, anonymous }) => {
  const patternAsts = [].concat(getMeaningfulNode(parse(pattern)));
  const ast = parse(text);

  return patternAsts
    .flatMap(patternAst => matchAsts(patternAst, ast, { anonymous }))
    .map(match => {
      const code =
        readLineToStart(text, match.start) +
        text.substring(match.start, match.end) +
        readLineToEnd(text, match.end);
      return { text: code, node: match };
    });
};

const getMeaningfulNode = ast => {
  switch (ast.type) {
    case 'File':
      return getMeaningfulNode(ast.program);
    case 'Program':
      return ast.body.map(getMeaningfulNode);
    case 'ExpressionStatement':
      return getMeaningfulNode(ast.expression);
    default:
      return ast;
  }
};

const stripDeep = (obj, comparator) => {
  if (!obj) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj;
  }

  const o = {};
  for (const [key, value] of Object.entries(obj)) {
    const comparatorValue = comparator ? comparator[key] : comparator;
    if (key === 'name' && comparatorValue === '_') {
      o[key] = comparatorValue;
    } else {
      o[key] = stripDeep(value, comparatorValue);
    }
  }

  return o;
};

const omitKeysDefault = new Set(['start', 'end', 'loc', 'computed']);

const matchAsts = (smaller, bigger, { anonymous }) => {
  const omitKeys = anonymous ? [...omitKeysDefault, 'name'] : omitKeysDefault;
  const matches = [];
  smaller = omitDeep(smaller, ...omitKeys);

  traverse(bigger, {
    enter(path) {
      const toCompare = stripDeep(omitDeep(path.node, ...omitKeys), smaller);
      if (deepEqual(toCompare, smaller)) {
        matches.push(path.node);
      }
    },
  });

  return matches;
};

const readLineToStart = (text, index) => {
  const range = text.substring(0, index);
  const match = /\r?\n(.*)$/.exec(range);
  if (!match) {
    return '';
  }
  return match[1];
};

const readLineToEnd = (text, index) => {
  const range = text.substring(index);
  const match = /^(.*)\r?\n/.exec(range);
  if (!match) {
    return '';
  }
  return match[1];
};
