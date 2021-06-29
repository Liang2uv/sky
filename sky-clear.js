/**
 * 清除缓存（可重置按键坐标）
 */
 alert('将清除缓存数据（可用于重置坐标），是否继续');
 var storage = storages.create("liang_2uv@qq.com:SKY"); // 本地存储
 storages.remove("liang_2uv@qq.com:SKY"); // 清除
 alert('清除缓存成功');
 exit();