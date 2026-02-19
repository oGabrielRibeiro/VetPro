import React from "react";
import ReactCompareImage from "react-compare-image";

export default function ExamCompareSlider({ fileA, fileB, token }) {
  const authToken = token || localStorage.getItem("token");

  const beforeUrl = `${fileA.viewUrl}?token=${authToken}`;
  const afterUrl = `${fileB.viewUrl}?token=${authToken}`;

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <h3>Comparação de Exames</h3>

      <ReactCompareImage
        leftImage={beforeUrl}
        rightImage={afterUrl}
        sliderLineColor="#00b894"
      />
    </div>
  );
}
