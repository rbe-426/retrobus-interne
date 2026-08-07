import React from 'react';
import { Icon } from '@chakra-ui/react';

/**
 * Icône Triangle Erreur - Style Trilogy
 * Triangle rouge rempli avec point d'exclamation blanc
 * Même style que les AlertIcon de Chakra (cercles remplis)
 */
const TriangleErrorIcon = (props) => (
  <Icon viewBox="0 0 24 24" {...props}>
    {/* Triangle rempli - centré et arrondi */}
    <path
      d="M12 3.5L3 19.5h18L12 3.5z"
      fill="currentColor"
      strokeLinejoin="round"
    />
    {/* Barre du point d'exclamation */}
    <rect
      x="11"
      y="9"
      width="2"
      height="6"
      rx="1"
      fill="white"
    />
    {/* Point du point d'exclamation */}
    <circle
      cx="12"
      cy="17"
      r="1"
      fill="white"
    />
  </Icon>
);

export default TriangleErrorIcon;
