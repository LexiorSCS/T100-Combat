// import FarmPathGeneratorNew from '../../../src/scenes/farm/FarmPathGeneratorNew.js';

import  Pathfinder from '../src/paths/pathfinder.js';

test('disaster test', () => {

    let pf = new Pathfinder();
    let from = {x: 0, y: 0};
    let to = {x: 0, y: 2};
    let result = pf.findPath(from, to);
    console.log(result);
    
    expect(result).toEqual([{x: 0, y: 1},
                             {x: 0, y: 1}]);
});

test('breaker test', () => {

    let pf = new Pathfinder();
    let from = {x: 1, y: 0};
    let to = {x: 1, y: 1};
    let result = pf.findPath(from, to);
    expect(result).toEqual([{x: 0, y: 1}]);
});

test('less trivial test', () => {

    let pf = new Pathfinder();
    //let now = {x: 0, y: 0};
    let from = {x: 0, y: 0};
    let to = {x: 0, y: 1};
    //let now = now + to;
    let result = pf.findPath(from, to);
    expect(result).toEqual([{x: 0, y: 1}]);
});

test('trivial test', () => {

    let pf = new Pathfinder();
    let from = {x: 0, y: 0};
    let to = {x: 0, y: 0};
    let result = pf.findPath(from, to);
    expect(result).toEqual([]);
});

