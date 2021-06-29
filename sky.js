var firstX; // 第一个按键x坐标
var firstY; // 第一个按键y坐标
var secondX;  // 第二个按键x坐标
var secondY;  // 第二个按键y坐标
var span; // 音符间的距离
var pot = {}; // 坐标系
var musicList; // 乐谱列表
var musicName; // 乐谱名字
var musicRead = false;  // 是否正确读取到乐谱
var musicJSON; // 读取到的乐谱内容（object）
var musicNotes = []; // 解析完成的乐谱内容
var floatWindow;  // 悬浮窗对象
var t1; // 定时器t1
var t2; // 定时器t2
var storage = storages.create('liang_2uv@qq.com:SKY');  // 本地存储
var key_position = 'POSITION';  // 存储位置信息的key

alert('弹奏脚本仅供娱乐和欣赏，请勿在【正规场合】弹奏(装逼)，使用过程中遇到问题请联系开发者 —— 光遇·脚滑');

if (!storage.contains(key_position)) {  // 没有自定义过按键坐标
  customPosition();
} else {  // 已自定义坐标
  let position = storage.get(key_position, { firstX: 770, firstY: 210, span: 200 });
  firstX = position.firstX;
  firstY = position.firstY;
  span = position.span;
  runProgram();
}

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
  
  alert('请在10秒内将浮标拖动到第一个按键位置');

  t1 = setTimeout(function() {
    firstX = floatWindow.getX();
    firstY = floatWindow.getY();
    alert('请在10秒内将浮标拖动到第二个按键位置');
    t2 = setTimeout(function() {
      secondX = floatWindow.getX();
      secondY = floatWindow.getY();
      span = Math.abs(secondX - firstX);
      storage.put(key_position, { firstX: firstX, firstY: firstY, span: span });
      log({ firstX: firstX, firstY: firstY, secondX: secondX, secondY: secondY, span: span });
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
  initPos();  // 1. 初始化按键坐标
  musicSelect();  // 2. 选择/读取乐谱
  if (musicRead) {
    musicParse(); // 3. 解析乐谱
    sleep(500);
    play(); // 4. 演奏
  }
  exit(); // 5. 退出程序
}

/**
 * @method 初始化按键坐标
 */
function initPos() {
  for (let i = 0; i < 15; i++) {
    pot[i] = {
      x: firstX + (i % 5) * span,
      y: firstY + Math.floor(i / 5) * span
    };
  }
  toast('初始化按键坐标完毕');
  log(pot);
}

/**
 * @method 选择/读取乐谱
 */
function musicSelect() {
  if (files.isDir('/sdcard/skyMusic/')) {
    musicList = files.listDir('/sdcard/skyMusic/', function (name) {
      return name.endsWith('.txt') && files.isFile(files.join('/sdcard/skyMusic/', name));
    });
    sort(musicList);
    if (musicList.length !== 0) {
      let musicIndex = dialogs.select('请选择乐谱', musicList);
      if (musicIndex >= 0) {
        musicName = musicList[musicIndex];
        if (files.isFile('/sdcard/skyMusic/' + musicName)) {
          try {
            var readable = files.open('/sdcard/skyMusic/' + musicName, 'r', 'x-UTF-16LE-BOM');
            var parsed = eval(readable.read())[0];
            readable.close();
            if(typeof(parsed.songNotes[0]) == 'number' || parsed.isEncrypted) {
              musicRead = false;
              alert('乐谱文件已加密，无法弹奏，请更换乐谱');
            } else {
              toast('读取乐谱成功');
              musicJSON = parsed;
              musicRead = true;
            }
          } catch (error) {
            musicRead = false;
            alert('读取乐谱失败，请更换乐谱文件');
            log('读取乐谱失败，请更换乐谱文件');
            log(error);
          }
        } else {
          musicRead = false;
          alert('乐谱文件不存在, 请将乐谱文件(xxx.txt)复制到skyMusic文件夹下');
        }
      } else {
        musicRead = false;
        toast('已取消选择');
      }
    } else {
      musicRead = false;
      alert('查询不到乐谱文件，请将乐谱文件放在skyMusic目录下');
      log('查询不到乐谱文件，请将乐谱文件放在skyMusic目录下');
    }
  } else {
    musicRead = false;
    toast('skyMusic文件夹不存在');
    log('skyMusic文件夹不存在');
    if (files.create('/sdcard/skyMusic/')) {
      alert('创建文件夹skyMusic成功，请将谱子放入该文件夹');
      log('创建文件夹skyMusic成功，请将谱子放入该文件夹');
    } else {
      alert('创建文件夹失败，请在根目录手动创建文件夹skyMusic');
      log('创建文件夹失败');
    }
  }
}

/**
 * @method 解析乐谱
 */
function musicParse() {
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
  toast('解析乐谱完毕');
}

/**
 * @method 弹奏
 */
function play() {
  for (let i = 0; i < musicNotes.length; i++) {
    let v = musicNotes[i];
    if (v.keys) {
      let gestureMap = [];
      for (let keyIndex = 0; keyIndex < v.keys.length; keyIndex++) {
        let k = v.keys[keyIndex];
        gestureMap.push([0, 5, [pot[k].x, pot[k].y], [pot[k].x, pot[k].y]]);
      }
      let gestureStr = JSON.stringify(gestureMap);
      eval('gestures(' + gestureStr.substr(1, gestureStr.length - 2) + ');');
    } else {
      sleep(v.time);
    }
  }
  log('弹奏完毕');
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