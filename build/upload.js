const qiniu = require('qiniu')
const fs = require('fs')
const path = require('path')

const cdnConfig = require('../app.config').cdn

// 不需要上传到七牛CDN的文件
const noNeedUploadFileList = ['index.html', 'server.ejs', 'server-entry.js']

const {
  ak, sk, bucket,
} = cdnConfig

const mac = new qiniu.auth.digest.Mac(ak, sk)

const config = new qiniu.conf.Config()
config.zone = qiniu.zone.Zone_z1

const doUpload = (key, file) => {
  const options = {
    scope: bucket + ':' + key,
  }
  const formUploader = new qiniu.form_up.FormUploader(config)
  const putExtra = new qiniu.form_up.PutExtra()
  const putPolicy = new qiniu.rs.PutPolicy(options)
  const uploadToken = putPolicy.uploadToken(mac)
  return new Promise((resolve, reject) => {
    formUploader.putFile(uploadToken, key, file, putExtra, (err, body, info) => {
      if (err) {
        return reject(err)
      }
      if (info.statusCode === 200) {
        resolve(body)
      } else {
        reject(body)
      }
    })
  })
}

const files = fs.readdirSync(path.join(__dirname, '../dist'))
const uploads = files.map(file => {
  // file是所有文件的文件名
  if (noNeedUploadFileList.indexOf(file) === -1) { // 不在上面的范围内的文件都上传
    return doUpload(
      file,
      path.join(__dirname, '../dist', file)
    )
  } else {
    return Promise.resolve('no need upload file ' + file)
  }
})
Promise.all(uploads).then(resps => {
  console.log('upload success:', resps)
}).catch(errs => {
  console.log('upload fail:', errs)
  // process.exit(0)
})
