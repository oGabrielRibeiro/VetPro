import React, { useEffect, useRef, useState } from "react";
import ReactCompareImage from "react-compare-image";
import { fetchBlobUrlFromApi, resolveApiPath } from "../utils/blobDownloads";

export default function ExamCompareSlider({ fileA, fileB }) {
  const [beforeUrl, setBeforeUrl] = useState("");
  const [afterUrl, setAfterUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const objectUrlsRef = useRef([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const [left, right] = await Promise.all([
          fetchBlobUrlFromApi(resolveApiPath(fileA?.viewUrl || "")),
          fetchBlobUrlFromApi(resolveApiPath(fileB?.viewUrl || "")),
        ]);
        if (!mounted) {
          URL.revokeObjectURL(left);
          URL.revokeObjectURL(right);
          return;
        }
        objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        objectUrlsRef.current = [left, right];
        setBeforeUrl(left);
        setAfterUrl(right);
      } catch {
        if (mounted) {
          setBeforeUrl("");
          setAfterUrl("");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, [fileA?.viewUrl, fileB?.viewUrl]);

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <h3>Comparação de Exames</h3>
      {loading && <p>Carregando imagens...</p>}
      {!loading && (!beforeUrl || !afterUrl) && (
        <p>Nao foi possivel carregar os exames para comparacao.</p>
      )}

      {!!beforeUrl && !!afterUrl && (
        <ReactCompareImage
          leftImage={beforeUrl}
          rightImage={afterUrl}
          sliderLineColor="#00b894"
        />
      )}
    </div>
  );
}
