import React from "react";
import AppIcon from "./AppIcon";

const SpeciesIcon = ({ species, subcategory, className = "" }) => {
  const normalizedSpecies = String(species || "").toLowerCase();
  const normalizedSub = String(subcategory || "").toLowerCase();

  let icon = "paw";
  if (normalizedSpecies.includes("mamif")) {
    if (normalizedSub.includes("can")) icon = "dog";
    else if (normalizedSub.includes("fel")) icon = "cat";
    else icon = "paw";
  } else if (normalizedSpecies.includes("ave")) {
    icon = "bird";
  } else if (normalizedSpecies.includes("peixe")) {
    icon = "fish";
  } else if (normalizedSpecies.includes("rept")) {
    icon = "reptile";
  }

  return <AppIcon name={icon} className={className} />;
};

export default SpeciesIcon;
