#!/usr/bin/env python

import json
import os

try:
    from setuptools import setup
except ImportError:
    from distutils.core import setup


def get_packages(package):
    """
    Return root package and all sub-packages.
    """
    return [dirpath
            for dirpath, dirnames, filenames in os.walk(package)
            if os.path.exists(os.path.join(dirpath, '__init__.py'))]


def get_package_data(package):
    """
    Return all files under the root package, that are not in a
    package themselves.
    """
    walk = [(dirpath.replace(package + os.sep, '', 1), filenames)
            for dirpath, dirnames, filenames in os.walk(package)
            if not os.path.exists(os.path.join(dirpath, '__init__.py'))]

    filepaths = []
    for base, filenames in walk:
        filepaths.extend([os.path.join(base, filename)
                          for filename in filenames])
    return {package: filepaths}


with open('ebagis_ui/static/ebagis_ui/version.json', 'r') as v:
    version = json.load(v)['version']

with open('README.md', 'r') as r:
    readme = r.read()

download_url = (
    'https://github.com/PSU-CSAR/django-ebagis-ui/tarball/%s'
)


setup(
    name='django-ebagis-ui',
    packages=get_packages('ebagis_ui'),
    package_data=get_package_data('ebagis_ui'),
    version=version,
    description=('Django app implementing the UI for the server-side portion of the BAGIS project.'),
    long_description=readme,
    author='Portland State University Center for Spatial Analysis and Research',
    author_email='jkeifer@pdx.edu',
    url='https://github.com/PSU-CSAR/ebagis-ui',
    install_requires=[
        #'django-ebagis>=0.3.0',
    ],
    license='',
)
