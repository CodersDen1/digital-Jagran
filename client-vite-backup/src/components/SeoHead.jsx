import React from 'react';
import { Helmet } from 'react-helmet-async';
import { renderMetaTags } from '../utils/metaTags';

const SeoHead = ({ metaTags }) => {
    return (
        <Helmet>
            {renderMetaTags(metaTags)}
        </Helmet>
    );
};

export default SeoHead;
