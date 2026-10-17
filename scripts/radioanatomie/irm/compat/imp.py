"""Module « imp » minimal pour les scripts Python de MRtrix3 3.0.4 (paquet Ubuntu), qui l'importent alors qu'il a été
retiré de Python 3.12 : seules find_module et load_module sont utilisées (chargement du paquet « mrtrix3 »).
Mis sur PYTHONPATH par etape3_segmentation.py, seulement pour les commandes MRtrix3."""
import importlib.util
import os
import sys


def find_module(nom, chemins):
    for c in chemins:
        p = os.path.join(c, nom)
        if os.path.isdir(p):
            return None, p, ('', '', 5)
        if os.path.exists(p + '.py'):
            return None, p + '.py', ('.py', 'r', 1)
    raise ImportError(nom)


def load_module(nom, fichier, chemin, description):
    if os.path.isdir(chemin):
        spec = importlib.util.spec_from_file_location(nom, os.path.join(chemin, '__init__.py'),
                                                      submodule_search_locations=[chemin])
    else:
        spec = importlib.util.spec_from_file_location(nom, chemin)
    module = importlib.util.module_from_spec(spec)
    sys.modules[nom] = module
    spec.loader.exec_module(module)
    return module
