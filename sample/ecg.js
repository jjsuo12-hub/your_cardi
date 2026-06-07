var Graph = function(canvas){
  //init parameters
  if(typeof canvas == 'string'){
    canvas = document.getElementById(canvas);
  }
  
  //set up the height and width
  canvas.setAttribute('width',canvas.offsetWidth);
  canvas.setAttribute('height',canvas.offsetHeight);
  //set up canvas colors
  canvas.style.backgroundColor = 'rgb(25,25,25)';
  
  //variables
  var width = canvas.offsetWidth;
  var height = canvas.offsetHeight;
  var ctx = canvas.getContext('2d');
  var gridTileWidth = 10;
  var currentXvalue = 0;
  var lastYvalue = 0;
  
  //global functions
  
  this.drawValue = function(value){
    drawValue(value);
  }
  
  this.getTimeInterval = function(){
    return 600 / (gridTileWidth * 5);
  }
  
  //functions
  
  function drawGrid(){
    ctx.lineWidth = 1;
    var i;
    var verticalGridTiles = width / gridTileWidth;
    var horizontalGridTiles = height / gridTileWidth;
    for(i = 0;i < verticalGridTiles;i++){
      ctx.beginPath();
      if(i / 5 == Math.round(i / 5)){
        ctx.strokeStyle = 'rgb(60,60,60)';
        ctx.lineWidth = 2;
      }else{
        ctx.strokeStyle = 'rgb(40,40,40)';
        ctx.lineWidth = 1;
      }
      ctx.moveTo(i * gridTileWidth,0);
      ctx.lineTo(i * gridTileWidth, height);
      ctx.stroke();
    }
    i = 0;
    for(i = 0;i < verticalGridTiles;i++){
      ctx.beginPath();
      if(i / 5 == Math.round(i / 5)){
        ctx.strokeStyle = 'rgb(40,40,40)';
        ctx.lineWidth = 2;
      }else{
        ctx.strokeStyle = 'rgb(50,50,50)';
        ctx.lineWidth = 1;
      }
      ctx.moveTo(0,i * gridTileWidth);
      ctx.lineTo(width,i * gridTileWidth);
      ctx.stroke();
    }
  }
  
  function drawValue(value){
    ctx.clearRect(currentXvalue,0,20,height);
    if(currentXvalue > width)
    {
       currentXvalue = 0;
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'lime';
    var center = height / 2;
    ctx.moveTo(currentXvalue,center - lastYvalue);
    currentXvalue++;
    ctx.lineTo(currentXvalue,center - value);
    ctx.stroke();
    lastYvalue = value;
    drawGrid();
  }
}

var graphInstance = new Graph('canvas');

var index = 0;
var torsades = false;
var asystole = []; 
var vTach = [0,2,5,8,10,12,15,18,20,28,30,33,50,52,56,52,40,30,20,15,10,5];
var vFib = [0];
setInterval(function(){
  if(rhythm === vFib){
    vFib = [vFib[vFib.length - 1]];
    for(var i = 0;i < 120;i++){
      var adjust = Math.random() * 4;
      if(vFib[i] > 50){
        adjust *= Math.abs(adjust) * -1;
      }else if(vFib[i] < -50){
        adjust = Math.abs(adjust)
      }else{
        adjust = adjust * (Math.random() > 0.5 ? 1 : -1);
      }
      vFib[i + 1] = vFib[i] + adjust;
    }
    rhythm = vFib;
  }
},1500);
var nsr = [0,0,0,0,0,0,0,5,10,14,16,17,16,14,10,7,5,4,3,2,1,0,-2,-4,-6,10,56,20,10,0,0,0,-5,0,0,0,5,6,7,8,9,9,9,8,7,6,5,4];
var beatsThisMinute = 0;
var rhythm = nsr;
var torsadesScale = 0.2;
var theta = 0;

setInterval(() => {
  theta += 0.1;
  torsadesScale = Math.sin(theta);
},100);

setInterval(function(){
  if(index >= rhythm.length){
    graphInstance.drawValue((Math.random() * 4));
  }else{
    if(rhythm[index] > 55){
      var context = new (window.AudioContext || window.webkitAudioContext)();
      var osc = context.createOscillator(); // instantiate an oscillator
      osc.type = 'square'; // this is the default - also square, sawtooth, triangle
      osc.frequency.value = 740; // Hz
      osc.connect(context.destination); // connect it to the destination
      osc.start(); // start the oscillator
      osc.stop(context.currentTime + .15); // stop 2 seconds after the current time
      beatsThisMinute++;
    }
    console.log(torsades);
    graphInstance.drawValue(rhythm[index] * 2 * (torsades ? torsadesScale : 1) + (Math.random() * 4));
  }
  index++;
  if(index > rhythm.length){
    setTimeout(function(){
      index = 0;
    },rhythm !== vTach && rhythm !== vFib ? (Math.random() * 100 + 500) : 0);
  }
},graphInstance.getTimeInterval());

function changeRhythm(event){
  switch(event.target.value){
    case 'NSR':
      rhythm = nsr;
      torsades = false;
      break;
    case 'vTach':
      rhythm = vTach;
      torsades = false;
      break;
    case 'torsades':
      rhythm = vTach;
      torsades = true;
      break;
    case 'vFib':
      rhythm = vFib;
      torsades = false;
      break;
    case 'asystole':
      rhythm = asystole;
      torsades = false;
      break;
  }
}

var rhythmChangeButtons = document.getElementsByClassName('rhythmChange');
for(var i = 0;i < rhythmChangeButtons.length;i++){
  rhythmChangeButtons[i].addEventListener('click',changeRhythm);
}