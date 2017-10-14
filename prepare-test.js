const fs = require('fs');
const lwip = require('pajk-lwip');

// Constants
const directories = { train: 'train', test: 'test' };

// Functions
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min)) + min;
const getImages = folder => fs.readdirSync(folder).map(filename => ({ filename, fullname: `${folder}/${filename}` }));
const randomCoordsGenerator = function*(width, height) {
  const coordsList = [];
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      coordsList.push({ x, y });
    }
  }

  while (true) {
    const pixelIndex = getRandomInt(0, coordsList.length);

    yield coordsList[pixelIndex];

    coordsList.splice(pixelIndex, 1);

    if (!coordsList.length) break;
  }
};
const convertChannel = channel => channel < 128 ? 255 : 0;
const convertPixel = pixel => ({
  r: convertChannel(pixel.r),
  g: convertChannel(pixel.g),
  b: convertChannel(pixel.b)
});

// Get images from train folder
const train_images = getImages(directories.train);

train_images.map(train_image => lwip.open(train_image.fullname,
  (err, image) => {
    if (err) throw new Error(err);

    let noise_level = 1;

    while (noise_level <= 100) {
      (function(noise_level) {
        image.clone((err, image) => {
          const getRandomCoord = randomCoordsGenerator(image.width(), image.height());

          const batch = image.batch();

          for (let i = 0; i < noise_level; i++) {
            const coord = getRandomCoord.next().value;
            const pixel = image.getPixel(coord.x, coord.y);
            const convertedPixel = convertPixel(pixel);

            batch.setPixel(coord.x, coord.y, convertedPixel);
          }

          batch.writeFile(`${directories.test}/${train_image.filename.charAt(0)}_${noise_level}.jpg`, (err) => {
            if (err) throw new Error(err);
          });
        });
      }(noise_level++))
    }
  }
))
