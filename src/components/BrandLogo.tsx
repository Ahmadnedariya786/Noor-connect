import React from 'react';
import {
  NoorDynamicLogo,
  type NoorDynamicLogoProps,
  type NoorLogoEditionId,
  type LogoEditionMeta,
  NOOR_LOGO_EDITIONS,
  getSelectedLogoEdition,
  getActiveLogoEdition,
  setSelectedLogoEdition,
  cycleLogoEdition,
  getLogoEditionStaticSvgString,
  LOGO_EDITION_CHANGE_EVENT,
  LOGO_EDITION_CHANGED_EVENT,
  NoorLogoVisualPicker,
} from './NoorDynamicLogo';

export type SirajLogoEditionId = NoorLogoEditionId;
export type SirajDynamicLogoProps = NoorDynamicLogoProps;

export const SIRAJ_LOGO_EDITIONS = NOOR_LOGO_EDITIONS;
export const getSelectedSirajLogoEdition = getSelectedLogoEdition;
export const setSelectedSirajLogoEdition = setSelectedLogoEdition;
export const cycleSirajLogoEdition = cycleLogoEdition;

export const SirajDynamicLogo: React.FC<SirajDynamicLogoProps> = (props) => {
  return <NoorDynamicLogo {...props} />;
};

export const SirajLogoVisualPicker = NoorLogoVisualPicker;
export const BrandLogo = SirajDynamicLogo;

export {
  NoorDynamicLogo,
  NOOR_LOGO_EDITIONS,
  getSelectedLogoEdition,
  getActiveLogoEdition,
  setSelectedLogoEdition,
  cycleLogoEdition,
  getLogoEditionStaticSvgString,
  LOGO_EDITION_CHANGE_EVENT,
  LOGO_EDITION_CHANGED_EVENT,
  NoorLogoVisualPicker,
};

export type { NoorDynamicLogoProps, NoorLogoEditionId, LogoEditionMeta };
export default BrandLogo;
