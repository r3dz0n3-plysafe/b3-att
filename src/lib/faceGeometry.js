export function calcDistance(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

export function getEAR(landmarks) {
  const leftV1 = calcDistance(landmarks[160], landmarks[144]);
  const leftV2 = calcDistance(landmarks[158], landmarks[153]);
  const leftH = calcDistance(landmarks[33], landmarks[133]);
  const leftEAR = (leftV1 + leftV2) / (2.0 * leftH);
  const rightV1 = calcDistance(landmarks[385], landmarks[380]);
  const rightV2 = calcDistance(landmarks[387], landmarks[373]);
  const rightH = calcDistance(landmarks[362], landmarks[263]);
  const rightEAR = (rightV1 + rightV2) / (2.0 * rightH);
  return (leftEAR + rightEAR) / 2.0;
}

export function getMAR(landmarks) {
  const V = calcDistance(landmarks[13], landmarks[14]);
  const H = calcDistance(landmarks[78], landmarks[308]);
  return V / H;
}

export function getEulerAngles(matrix) {
  const m00 = matrix[0];
  const m10 = matrix[1], m11 = matrix[5], m12 = matrix[9];
  const m20 = matrix[2], m21 = matrix[6], m22 = matrix[10];
  const sy = Math.sqrt(m00 * m00 + m10 * m10);
  const singular = sy < 1e-6;
  let pitch, yaw, roll;
  if (!singular) {
    pitch = Math.atan2(m21, m22);
    yaw = Math.atan2(-m20, sy);
    roll = Math.atan2(m10, m00);
  } else {
    pitch = Math.atan2(-m12, m11);
    yaw = Math.atan2(-m20, sy);
    roll = 0;
  }
  return {
    pitch: pitch * (180 / Math.PI),
    yaw: yaw * (180 / Math.PI),
    roll: roll * (180 / Math.PI),
  };
}

export function getFaceBounds(landmarks) {
  let minX = 1.0, minY = 1.0, maxX = 0.0, maxY = 0.0;
  for (const lm of landmarks) {
    if (lm.x < minX) minX = lm.x;
    if (lm.y < minY) minY = lm.y;
    if (lm.x > maxX) maxX = lm.x;
    if (lm.y > maxY) maxY = lm.y;
  }
  return { minX, minY, maxX, maxY };
}