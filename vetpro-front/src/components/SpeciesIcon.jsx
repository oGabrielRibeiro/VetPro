import React from "react";
import AppIcon from "./AppIcon";

const normalize = (value = "") =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const SpeciesIcon = ({ species, subcategory, breed, className = "" }) => {
  const source = normalize(`${species || ""} ${subcategory || ""} ${breed || ""}`);

  let icon = "paw";
  if (/(canin|cachorr|cao|dog)/.test(source)) icon = "dog";
  else if (/(felin|gato|cat)/.test(source)) icon = "cat";
  else if (/(equin|cavalo|egua|quarto de milha|mangalarga|crioulo)/.test(source)) icon = "horse";
  else if (/(bovin|vaca|boi|bezerro|nelore|holandes|girolando|jersey|angus)/.test(source)) icon = "cow";
  else if (/(ovin|ovelha)/.test(source)) icon = "sheep";
  else if (/(caprin|cabra|bode)/.test(source)) icon = "goat";
  else if (/(suin|porco)/.test(source)) icon = "pig";
  else if (/(ave|passaro|galinha|psitac)/.test(source)) icon = "bird";
  else if (/(peixe|pisc)/.test(source)) icon = "fish";
  else if (/(rept|serpente|cobra|iguana|jabuti|tartaruga)/.test(source)) icon = "reptile";

  return <AppIcon name={icon} className={className} />;
};

export default SpeciesIcon;
