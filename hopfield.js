const fs = require('fs');
const lwip = require('pajk-lwip');
const math = require('mathjs');

const directories = { train: 'train', test: 'test' };
const stats = {};

const printMatrix = (matrix, size) => {
  for (let i = 0; i < size; i++) {
    let str = '';
    for (let j = 0; j < size; j++) {
      str += ` ${matrix[i][j]}`;
    }
    console.log(str);
  }
}
const printMatrixFromArray = (arr, n, m) => {
  for (let i = 0; i < n; i++) {
    let str = '';
    for (let j = 0; j < m; j++) {
      str += ` ${arr[j * m + i] == -1 ? '0' : '/'}`;
    }
    console.log(str);
  }
}
const printResources = (resources) => {
  console.log('###################################################');
  console.log('Resources');
  console.log('###################################################');

  Object.entries(resources).map(([key, value]) => {
    printMatrixFromArray(value, 10, 10);
    console.log();
  });
}
const getImages = folder => fs.readdirSync(folder).map(filename => ({ name: filename, fullname: `${folder}/${filename}` }));
const initEmptyMatrix = (size) => {
  const M = [];

  for (let i = 0; i < size; i++) {
    M[i] = [];
    for (let j = 0; j < size; j++) {
      M[i][j] = 0;
    }
  }

  return M;
};
const arrayToImage = (array, size) => {
  const image = [];

  for (let i = 0; i < size; i++) {
    image[i] = [];
    for (let j = 0; j < size; j++) {
      const value = array[i * size + j] === 1 ? 255 : 0;
      image[i][j] = ({ r: value, g: value, b: value });
    }
  }

  return image;
};
const prepareVector = (image) => {
  const resultVector = [];

  const pixelToNumber = ({ r, g, b }) => r < 128 ? -1 : 1;

  for (let i = 0; i < image.width(); i++) {
    for (let j = 0; j < image.height(); j++) {
      resultVector.push(pixelToNumber(image.getPixel(i, j)));
    }
  }

  return resultVector;
};
const vectorize = (filenames, object) => Promise.all(
  filenames
    .map(filename => filename.fullname)
    .map(path => new Promise((resolve, reject) =>
      lwip.open(path, (err, image) => {
        if (err) throw new Error(err);

        image.clone((err, image) => {
          object[path] = prepareVector(image);
          resolve();
        });
      })
    ))
);
const isEqual = (arr1, arr2) => (arr1.length === arr2.length) && arr1.every((el, ind) => el === arr2[ind]);

const vectorized = {
  train: {},
  test: {}
};

// All images should be 10x10 pixels
const train_images = getImages(directories.train);
const test_images = getImages(directories.test);

Promise.all([
  vectorize(train_images, vectorized.train),
  vectorize(test_images, vectorized.test)
]).then(() => {
  printResources(vectorized.train);
  // printResources(vectorized.test);

  return Promise.resolve();
}).then(() => {
  const W = initEmptyMatrix(100);

  // Training
  Object.entries(vectorized.train).map(([filename, vector]) => {
    stats[filename] = 0;

    for (let i = 0; i < 100; i++) {
      for (let j = i + 1; j < 100; j++) {
        W[i][j] += vector[i] * vector[j];
        W[j][i] = W[i][j];
      }
    }
  });

  // Testing
  Object.entries(vectorized.test).map(([filename, vector]) => {
    let wasFound = false;

    for (let iteration = 0; iteration < 10000; iteration++) {
      const index = math.randomInt(0, W.length);

      vector[index] = math.dot(W[index], vector) > 0 ? 1 : -1;

      Object.entries(vectorized.train).map(([filename, vector_model]) => {
        if (isEqual(vector, vector_model)) {
          wasFound = true;
          stats[filename]++;
        }
      });

      if (wasFound) break;
    }

    // Draw vector and save
    (function(imagePixels) {
      lwip.create(10, 10, (err, image) => {
        const batch = image.batch();

        for (let i = 0; i < 10; i++) {
          for (let j = 0; j < 10; j++) {
            batch.setPixel(i, j, imagePixels[i][j]);
          }
        }

        batch.writeFile(`result_${filename}`, (err) => {
          if (err) throw new Error(err);
        });
      });
    }(arrayToImage(vector, 10)));
  });

  return Promise.resolve();
}).then(() => {
  console.log(stats);

  return Promise.resolve();
})

