import React from 'react';
import { Icon } from '@chakra-ui/react';

// Icône provisoire : remplacer le contenu du <path> par le SVG maison (viewBox 24x24, currentColor).
const AmendmentIcon = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path
      d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3zm9.5-12.5 3 3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

export default AmendmentIcon;
