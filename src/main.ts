import "./style.css";


import {fromEvent, interval, merge} from 'rxjs'
import {map, filter, scan} from 'rxjs/operators'


function main() {
  /**
   * Inside this function you will use the classes and functions from rx.js
   * to add visuals to the svg element in pong.html, animate them, and make them interactive.
   *
   * Study and complete the tasks in observable examples first to get ideas.
   *
   * Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/
   *
   * You will be marked on your functional programming style
   * as well as the functionality that you implement.
   *
   * Document your code!
   */

  /**
   * This is the view for your game to add and update your game elements.
   */
  const svg = document.querySelector("#svgCanvas") as SVGElement & HTMLElement;

  // Score element to contain a text
  const score = document.createElementNS(svg.namespaceURI, "text");
    score.setAttribute('id', "scoreId");
    score.setAttribute('x', "40%");
    score.setAttribute('y', "15%");
    score.setAttribute("class", "big");
    score.setAttribute(
      "style",
      "fill: white"
      );

  // the text that will be appended to score element
  const scoreText = document.createTextNode("HI-SCORE 0");
  svg.appendChild(score);
  score.appendChild(scoreText);    
      
  const instruction = document.createElementNS(svg.namespaceURI, "text");
  instruction.setAttribute('id', "instruct");
  instruction.setAttribute('x', "10%");
  instruction.setAttribute('y', "8%");
  instruction.setAttribute("class", "small");
  instruction.setAttribute(
    "style",
    "fill: white"
    );

  const instructionText = document.createTextNode("Up: ArrowUp | Down: ArrowDown | Left: ArrowLeft | Right: ArrowRight");
  svg.appendChild(instruction);
  instruction.appendChild(instructionText);


  
  // Tick class
  class Tick { constructor(public readonly elapsed:number) {} }

  // Move class
  class Move {
    constructor(public readonly x: number, public readonly y: number) {}
  }

  // CONSTANTS value 
  const CONSTANTS = {
    GAME_TICK: 10,
    FROG_START_X: 300,
    FROG_START_Y: 580,
    FROG_MOVE_DIST: 40,
    BODY_MOVE_DIST: 1,
    SPACING: 40,
    BODY_HEIGHT: '40',
    CAR_WIDTH: '50',
    LOG_WIDTH: '120',
  } as const;


  // 6 data types
  // frog type properties
  type Frog = Readonly<{
    id: string,
    x: number,
    y: number,
    r: number
  }>

  // car type properties
  type Car = Readonly<{
    id: string,
    x: number,
    y: number,
    width: number,
    direction: number
    speed: number
  }>

  // log type properties 
  type Log = Readonly<{
    id: string,
    x: number,
    y: number,
    width: number
    direction: number
    speed: number
  }>

  // target type properties
  type Target = Readonly<{
    id: string,
    x: number,
    y: number,
    width: number
    frogOn: boolean;
  }>

  // Union type of car and log so they can share some functions
  type Body = Car | Log;

  // State type propertiess
  type State = Readonly<{
    time: number,
    frog: Frog
    cars: Readonly<Car[]>
    logs: Readonly<Log[]>
    targets: Readonly<Target[]>
    gameOver: boolean,
    score: number
  }>

  // Initial State value 
  const initialState: State = {
    time: 0,
    frog: createFrog(),
    cars: [createCar("car1", 1, 3), createCar("car2", 2, 1), createCar("car3", 3, 2), createCar("car4", 4, 4)],
    logs: [createLog("log1", 1, 2), createLog("log2", 2, 1), createLog("log3", 3, 1.5), createLog("log4", 4, 2)],
    targets: [1,2,3].map(e=>createTarget('target'+e, e)),
    gameOver: false,
    score: 0
  };

  // 4 functions to create frog, car, log, target area object
  // create frog object function
  function createFrog(): Frog {
    return {
      id: 'frog',
      x: CONSTANTS.FROG_START_X,
      y: CONSTANTS.FROG_START_Y,
      r: 17.5
    }
  }

  // create car object function
  function createCar(_id: string, row: number, _speed: number): Car {
    return {
      id: _id,
      x: row % 2 == 0? 500: 0,
      y: 600 - (row+1) * CONSTANTS.SPACING,
      width: Number(CONSTANTS.CAR_WIDTH),
      direction: row % 2 == 0? -1: 1,
      speed: _speed
    }
  }

  // create log object function
  function createLog(_id: string, row: number, _speed: number): Log {
    return {
      id: _id,
      x: row % 2 == 0? 500: 0,
      y: 0 + (row+4) * CONSTANTS.SPACING,
      width: Number(CONSTANTS.LOG_WIDTH),
      direction: row % 2 == 0? -1: 1,
      speed: _speed
    }
  }

  // create target area object function
  function createTarget(_id: string, col: number): Target {
    return {
      id: _id,
      x: 3*col*CONSTANTS.SPACING,
      y: 3*CONSTANTS.SPACING,
      width: 40,
      frogOn: false
    }
  }

  // function used to create rectangle view
  const createRectView = (id: string, x: string, y: string, width: string, height: string, fill: string) =>{
    const view = document.createElementNS(svg.namespaceURI, 'rect');
    view.setAttribute('id', id);
    view.setAttribute('x', x);
    view.setAttribute('y', y);
    view.setAttribute('width', width);
    view.setAttribute('height', height);
    view.setAttribute('style', 'fill: '+fill);
    svg.appendChild(view);
  }

  // a small function to check if a keyboard event key is one of the designated move key
  const isMoveKey = (k: string): boolean =>{
    return k==='ArrowUp' || k==='ArrowDown' || k==='ArrowLeft' || k==='ArrowRight';
  }



  // frog, river, road and target areas are created, The variables are not used except frog
  const frog = document.createElementNS(svg.namespaceURI, "circle");
  frog.setAttribute("id", "frog");
  frog.setAttribute("r", "17.5");
  frog.setAttribute("cx", "300");
  frog.setAttribute("cy", "575");
  frog.setAttribute(
    "style",
    "fill: green; stroke: green; stroke-width: 1px;"
  );
  svg.appendChild(frog);

  // river
  const river = createRectView('river', '0', 5*CONSTANTS.SPACING+'', '600', 4*CONSTANTS.SPACING+'', 'blue');

  // road
  const road = createRectView('road', '0', 600-(5*CONSTANTS.SPACING)+'', '600', 4*CONSTANTS.SPACING+'', 'darksalmon');

  // target areas
  const createTargetAreas = (() => {
    [1,2,3].forEach(e=>createRectView("targetView" + e, 3*e*CONSTANTS.SPACING+'', 3*CONSTANTS.SPACING+'', '40', '40', 'violet'))
  })();



  // 2 main observable streams
  // tick stream
  const tick$ = interval(CONSTANTS.GAME_TICK).pipe(map(t=>new Tick(t)));

  // keyboard event stream
  const move$ = fromEvent<KeyboardEvent>(document, 'keydown')
                  .pipe(
                    filter(({key})=>isMoveKey(key)),
                    filter(({repeat})=>!repeat),
                    map(({key})=>newMove(key))
                  )
  

  // 6 helper functions below 
  // moveObj is used to update the position of the logs and cars, since I do not create new car or log, I reset all the existing position if they go beyond the canvas
  const moveObj = (b: Body) => <Body>{
    ...b,
    x: b.direction === 1? (b.x > 650? 0-b.width : b.x + b.speed) : (b.x < 0-b.width? 650 : b.x - b.speed)
  }             

  // create a new move based on key pressed
  const newMove = (k: string): Move =>{
    return k==='ArrowUp'? new Move(0, -CONSTANTS.FROG_MOVE_DIST) 
            : k==='ArrowDown'? new Move(0, CONSTANTS.FROG_MOVE_DIST)
              : k==='ArrowLeft'? new Move(-CONSTANTS.FROG_MOVE_DIST, 0)
                : new Move(CONSTANTS.FROG_MOVE_DIST, 0);
  }

  // check if frog is within river area
  const isOnRiver = (f: Frog): boolean =>{
    return f.y < 360 && f.y > 200;
  }

  // check if frog is collided with car, this function is also used by log to check if frog is within (above) the log area
  const collided = (f: Frog, b: Body | Target): boolean => {
    if ((b.y + 20) == f.y) {
      return f.x + f.r > b.x && f.x - f.r < b.x + b.width;
    }
    else 
      return false
  }

  // function to update the state by creating a new state
  const reduceState = (s:State, e:Move|Tick|number)=> {
    const frogReachTarget = !s.targets.every(t=>t.frogOn==false); // simply check if frog has been to any target or not
    return e instanceof Tick? {
                              ...s, 
                              time: e.elapsed,
                              // frog position will reset to starting point if it reached the distinct area
                              frog: frogReachTarget? {...s.frog, x: CONSTANTS.FROG_START_X, y: CONSTANTS.FROG_START_Y}: {
                                  ...s.frog,
                                  // frog position changes every tick if it is on a log object
                                  x: (() => {
                                    const onLog = s.logs.filter(l=>collided(s.frog, l)==true);
                                    const l = onLog.length>0? onLog[0] : null;
                                    if (l!=null && s.frog.x > l.x && s.frog.x < l.x + l.width)
                                      return s.frog.x + l.speed * l.direction;
                                    else
                                      return s.frog.x;
                                })()
                              },
                              cars: s.cars.map(moveObj), 
                              logs: s.logs.map(moveObj),
                              // check if frog is on any targeted area
                              targets: frogReachTarget? s.targets.map(t=><Target>{...t, frogOn: false}) : s.targets.map(t=><Target>{...t, frogOn: collided(s.frog, t)}),
                              // check if frog is collided with car or dropped into the river
                              gameOver: s.cars.filter(c=>collided(s.frog, c)).length > 0 || (isOnRiver(s.frog) && !(s.logs.filter(c=>collided(s.frog, c)).length > 0)),
                              // score +100 if frog is at the target
                              score: frogReachTarget? s.score+50 : s.score
            } : e instanceof Move? {...s, 
                                    // frog is prevented from moving out of the canvas
                                    frog: {
                                                  ...s.frog,
                                                  x: (s.frog.x+e.x<0)? 20 : (s.frog.x+e.x>600)? 580 : s.frog.x + e.x, 
                                                  y: (s.frog.y+e.y<0 || s.frog.y+e.y>600)? s.frog.y : s.frog.y + e.y, 
                                          }
                  } : {...s}
  };


  // since target view position is fixed, we do not need to update or set its attribute every time
  [1,2,3].forEach(e=>createRectView("targetView" + e, 3*e*CONSTANTS.SPACING+'', 3*CONSTANTS.SPACING+'', '40', '40', 'violet'));

  /*
  helper function to update cars view
  */
  function updateCarView(s: State): void {
    const svg = document.getElementById("svgCanvas")!;
    s.cars.forEach(c=>{
      const createCarView = () =>{
        const v = document.createElementNS(svg.namespaceURI, "rect");
        v.setAttribute("id", c.id+"")
        svg.appendChild(v);
        return v;
      }
      const v = document.getElementById(c.id+"") || createCarView();
      v.setAttribute('width', CONSTANTS.CAR_WIDTH);
      v.setAttribute('height', CONSTANTS.BODY_HEIGHT);
      v.setAttribute('x', c.x+"");
      v.setAttribute('y', c.y+"");
      v.setAttribute("style", "fill: red");
    })
  }

  /*
  helper function to update logs view
  */
  function updateLogView(s: State): void {
    const svg = document.getElementById("svgCanvas")!;
    s.logs.forEach(l=>{
      const createLogView = () =>{
        const v = document.createElementNS(svg.namespaceURI, "rect");
        v.setAttribute("id", l.id+"")
        svg.appendChild(v);
        return v;
      }
      const v = document.getElementById(l.id+"") || createLogView();
      v.setAttribute('width', CONSTANTS.LOG_WIDTH);
      v.setAttribute('height', CONSTANTS.BODY_HEIGHT);
      v.setAttribute('x', l.x+"");
      v.setAttribute('y', l.y+"");
      v.setAttribute("style", "fill: orange");
    })
  }

  // main update view function
  function updateView(s: State): void {
    const frog = document.getElementById("frog")!;
    frog.setAttribute("cx", (s.frog.x)+"");
    frog.setAttribute("cy", (s.frog.y)+"");

    updateCarView(s);
    updateLogView(s);

    svg.appendChild(frog);

    // remove exisiting text node appended
    document.getElementById('scoreId')!.firstChild?.remove()
    const scoreText = document.createTextNode("HI-SCORE " + s.score);   // create a new text node
    score.appendChild(scoreText)                                        // append the new text node

    // unsubscribe the stream if gameOver is true
    if (s.gameOver)
      subscription.unsubscribe();
  }

// the subscription of the stream  
const subscription = merge(move$, tick$).pipe(scan(reduceState, initialState)).subscribe(updateView);

}


// The following simply runs your main function on window load.  Make sure to leave it in place.
if (typeof window !== "undefined") {
  window.onload = () => {
    main();
  };
}
