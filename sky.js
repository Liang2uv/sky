var pos; // 坐标系
var isPlay = false;  // 是否可以弹奏乐谱

var musicDir = '/sdcard/skyMusic/'; // 乐谱文件存放目录
var musicList; // 乐谱列表
var musicName; // 乐谱名字
var musicIndex = 0; // 选择的乐谱下标
var musicJSON; // 读取到的乐谱内容（object）
var musicNotes = []; // 解析完成的乐谱内容

var speed_list = [0.2, 0.4, 0.6, 0.8, 1, 1.5, 1.8, 2]; // 弹奏速度
var speed = 1;  // 弹奏速度

var floatWindow;  // 悬浮窗对象
var t1; // 定时器t1
var t2; // 定时器t2

var storage;  // 本地存储对象
var storage_name = 'liang_2uv@qq.com:SKY';  // 本地存储的名字
var storage_key = 'POSITION';  // 存储位置信息的key

/**
 * @method 自执行函数（主函数入口）
 */
(function() {
  tip('弹奏脚本仅供娱乐和欣赏，请勿在【正规场合】弹奏(装逼)，使用过程中遇到问题请联系开发者 —— 光遇·脚滑', 'alert');
  storage = storages.create(storage_name);
  if (!storage.contains(storage_key)) {  // 没有自定义过按键坐标
    customPosition();
  } else {  // 已自定义坐标
    pos = storage.get(storage_key);
    tip('初始化按键坐标完毕');
    runProgram();
  }
})();


/**
 * @method 自定义按键坐标
 */
function customPosition() {
  floatWindow = floaty.window(
    <frame gravity="center">
    </frame>
  );
  floatWindow.setPosition(770, 210);
  floatWindow.setAdjustEnabled(true);
  
  tip('请在10秒内将浮标拖动到第一个按键位置', 'alert');

  t1 = setTimeout(function() {
    let x1 = floatWindow.getX();
    let y1 = floatWindow.getY();
    tip('请在10秒内将浮标拖动到第二个按键位置', 'alert');
    t2 = setTimeout(function() {
      let x2 = floatWindow.getX();
      pos = getPos(x1, y1, Math.abs(x2 - x1));
      tip('初始化按键坐标完毕');
      storage.put(storage_key, pos);
      floatWindow.close();
      clearTimeout(t1);
      clearTimeout(t2);
      runProgram();
    }, 10000);
  }, 10000);
}

/**
 * @method 运行主要程序
 */
function runProgram() {
  musicItems(); // 1. 获取乐谱列表
  while(true) {
    musicSelect();  // 2. 选择/读取乐谱
    musicParse(); // 3. 解析乐谱完毕
    speedSelect();  // 4. 选择弹奏速度
    play(); // 5. 演奏
  }
}

/**
 * @method 获取乐谱列表
 */
function musicItems() {
  if (files.isDir(musicDir)) {
    musicList = files.listDir(musicDir, function (name) {
      return name.endsWith('.txt') && files.isFile(files.join(musicDir, name));
    });
    sort(musicList);
    if (!musicList.length) {
      tip('查询不到乐谱文件，请将乐谱文件放在skyMusic目录下', 'alert');
    }
  } else {
    tip('skyMusic文件夹不存在');
    if (files.create(musicDir)) {
      tip('创建文件夹skyMusic成功，请将谱子放入该文件夹', 'alert');
    } else {
      tip('创建文件夹失败，请在根目录手动创建文件夹skyMusic', 'alert');
    }
  }
}

/**
 * @method 选择/读取乐谱
 */
function musicSelect() {
  isPlay = false;
  if (!musicList.length) { return; }
  do {
    musicIndex = dialogs.singleChoice('请选择乐谱', musicList, musicIndex);
  } while(musicIndex < 0);
  musicName = musicList[musicIndex];
  if (!files.isFile(musicDir + musicName)) { tip('乐谱文件不存在, 请将乐谱文件(xxx.txt)复制到skyMusic文件夹下', 'alert'); return; }
  try {
    let readable = files.open(musicDir + musicName, 'r', 'x-UTF-16LE-BOM');
    let parsed = eval(readable.read())[0];
    readable.close();
    if(typeof(parsed.songNotes[0]) == 'number' || parsed.isEncrypted) {
      tip('乐谱文件已加密，无法弹奏，请更换乐谱', 'alert');
    } else {
      tip('读取乐谱成功');
      musicJSON = parsed;
      isPlay = true;
    }
  } catch (error) {
    tip('读取乐谱失败，请更换乐谱文件', 'alert');
  }
}

/**
 * @method 解析乐谱
 */
function musicParse() {
  if (!isPlay) { return; }
  let time = musicJSON.songNotes[0].time;
  musicNotes.push({ time: time });
  musicNotes.push({ keys: [Number(musicJSON.songNotes[0].key.replace(/^(?:\d)?Key(\d{1,})$/, '$1'))] });
  for(let i = 1; i < musicJSON.songNotes.length; i++) {
    let key = Number(musicJSON.songNotes[i].key.replace(/^(?:\d)?Key(\d{1,})$/, '$1'));
    if (musicJSON.songNotes[i].time === musicJSON.songNotes[i - 1].time) {  // 同时按下
      musicNotes[musicNotes.length - 1].keys.push(key);
    } else {
      musicNotes.push({ time: musicJSON.songNotes[i].time - musicJSON.songNotes[i - 1].time });
      musicNotes.push({ keys: [key] });
    }
  }
  tip('解析乐谱完毕');
}

/**
 * @method 选择弹奏速度
 */
function speedSelect() {
  if (!isPlay) { return; }
  let i = dialogs.singleChoice('请选择弹奏速度', speed_list, 4);
  if (i < 0) { speed = 1; }
  else { speed = speed_list[i]; }
}

/**
 * @method 弹奏
 */
function play() {
  if (!isPlay) { return; }
  tip('即将为您弹奏《' + musicName.substr(0, musicName.indexOf('.txt')) + '》（' + speed + '倍速）', 'alert');
  for (let i = 0; i < musicNotes.length; i++) {
    let v = musicNotes[i];
    if (v.keys) {
      let gestureMap = [];
      for (let keyIndex = 0; keyIndex < v.keys.length; keyIndex++) {
        let k = v.keys[keyIndex];
        gestureMap.push([0, 5, [pos[k].x, pos[k].y], [pos[k].x, pos[k].y]]);
      }
      let gestureStr = JSON.stringify(gestureMap);
      eval('gestures(' + gestureStr.substr(1, gestureStr.length - 2) + ');');
    } else {
      sleep(Math.round(v.time * (1 / speed)));
    }
  }
  tip('弹奏完毕');
}

/**
 * @method 初始化按键坐标
 * @param x 第一个按键x坐标
 * @param y 第一个按键y坐标
 * @param span 按键间隔
 */
 function getPos(x, y, span) {
  let position = {};
  for (let i = 0; i < 15; i++) {
    position[i] = {
      x: x + (i % 5) * span,
      y: y + Math.floor(i / 5) * span
    };
  }
  return position;
}

/**
 * @method 数组排序（中文+英文）
 * @param arr 需要排序的数组
 */
function sort(arr) {
  arr.sort(function (item1, item2) {
    return item1.localeCompare(item2);
  });
}

/**
 * @method 提示
 */
function tip(text, type) {
  if (type === 'alert') {
    alert(text);
  } else {
    toast(text);
  }
  log(text);
}