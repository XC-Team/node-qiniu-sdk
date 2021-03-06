const common = require('./common');
// 检查是否已经配置好了qiniu.config文件
common.beforeTest();

const fs = require('fs');
const expect = require('chai').expect;
const debug = require('debug')('test');
const Qiniu = require('../index');
const qiniu_config = require('./resource/qiniu.config');
const qiniu = new Qiniu(qiniu_config.AccessKey, qiniu_config.SecretKey);

const CONST = {
  bucketName: null,
  fileName: 'image.test.jpg',
  scope: null,
  domain: null,
  url: null
};
describe('SDK 相关方法测试', function(){
  this.timeout(20000);
  before(async function(){
    // 下载file.image.test.jpg测试文件
    await common.testFile('file.image.test.jpg');

    // 随机个名字
    CONST.bucketName = new Date().getTime() + '';
    CONST.scope = CONST.bucketName + ':' + CONST.fileName;

    // 创建储存空间
    let r1 = await qiniu.bucket(CONST.bucketName).mk();
    debug('创建bucket：%s并返回：%s', CONST.bucketName, JSON.stringify(r1));

    // 获取空间域名
    let r2 = await qiniu.bucket(CONST.bucketName).domain();
    debug('获取空间域名返回：%s', JSON.stringify(r2));
    CONST.domain = 'http://' + r2[0];

    // 上传图片
    let r3 = await qiniu.file(CONST.scope).upload(__dirname + '/resource/file.image.test.jpg');
    debug('上传图片返回：%s', JSON.stringify(r3));
    // 文件路径
    CONST.url = CONST.domain + '/' + CONST.fileName;
  });
  it('buckets 获取 Bucket 列表', async function(){
    let result = await qiniu.buckets();
    debug('获取 Bucket 列表并返回：%s', JSON.stringify(result));
    expect(result.error).to.be.undefined;
    expect(result).to.be.an('array');
  });
  it('sisyphus 异步第三方资源抓取', async function(){
    let result = await qiniu.sisyphus({
      body: {
        url: [
          'https://www.baidu.com/img/bd_logo1.png?qua=high',
          'https://ss0.baidu.com/6ONWsjip0QIZ8tyhnq/it/u=3436665273,1985018126&fm=58&w=200&h=200&img.JPEG'
        ],
        bucket: CONST.bucketName
      }
    });
    debug('异步第三方资源抓取并返回：%s', JSON.stringify(result));
    expect(result).to.be.an('object');
    expect(result.error).to.be.undefined;
    expect(result.id).to.be.a('string');

    // 任务id设置到全局
    sisyphus_id = result.id;
  });
  it('sisyphusStatus 查看异步第三方资源抓取的状态', async function(){
    let result = await qiniu.sisyphusStatus(sisyphus_id, 'z0');
    debug('查看异步第三方资源抓取的状态并返回：%s', JSON.stringify(result));
    expect(result).to.be.an('object');
    expect(result.error).to.be.undefined;
    expect(result.id).to.be.a('string');
  });
  it('batch 批量操作', async function(){
    // 不需要管是否操作成功了
    // 只要有正确的返回数据就可以了
    let ops = [
      { _type: 'move', bucket: CONST.bucketName, fileName: 'test.png', dest: CONST.bucketName + ':test-1.png', force: false },
      { _type: 'copy',bucket: CONST.bucketName,fileName: 'test2.png',dest: CONST.bucketName + ':test-2.png',force: false },
      { _type: 'chtype', bucket: CONST.bucketName, fileName: 'test3.png', type: 1 },
      { _type: 'stat', bucket: CONST.bucketName, fileName: 'test-1.png' },
      { _type: 'delete', bucket: CONST.bucketName,fileName: 'test.js' }
    ]
    let result = await qiniu.batch({ ops: ops });
    debug('批量操作并返回：%s', JSON.stringify(result));
    expect(result.error).to.be.undefined;
    expect(ops.length === result.length).to.be.ok;
    expect(result).to.be.an('array');
  });
  it('download 公开资源下载到本地', async function(){
    let local_path = __dirname + '/resource/image.download.public.test.jpg';
    await Qiniu.prototype.download({
      url: CONST.url,
      isPublic: true,
      path: local_path
    });
    expect(fs.existsSync(local_path)).to.be.ok;
  });
  it('download 私有资源下载到本地', async function(){
    // 设置仓库私有化
    let r1 = await qiniu.bucket(CONST.bucketName).private(1);
    debug('设置仓库私有化：%s并返回：%s', JSON.stringify(r1));

    // let r2 = await qiniu.download({
    //   url: CONST.url,
    //   isPublic: true
    // });
    // debug('以下载公共资源的方法下载此私有资源：%s并返回：%s', JSON.stringify(r2));

    let local_path = __dirname + '/resource/image.download.private.test.jpg';
    await qiniu.download({
      url: CONST.url,
      stream: fs.createWriteStream(local_path)
    });
    expect(fs.existsSync(local_path)).to.be.ok;
  });
  after(async function(){
    let result = await qiniu.bucket(CONST.bucketName).drop();
    debug('删除Bucket并返回：%s', JSON.stringify(result));
    expect(result).to.be.an('object');
    expect(result.error).to.be.undefined;
  });
});