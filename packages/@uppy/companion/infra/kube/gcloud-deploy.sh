#!/usr/bin/env bash
set -o pipefail
set -o errexit
set -o nounset
# set -o xtrace

# Set magic variables for current FILE & DIR
__dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
__kube="${__dir}"
__companion="$(dirname "$(dirname "${__kube}")")"
# Install kubectl
curl -LO https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl
chmod +x ./kubectl
sudo mv ./kubectl /usr/local/bin/kubectl


# Store the new image in docker hub
docker build --quiet -t transloadit/uppy-server:latest -t transloadit/uppy-companion:$TRAVIS_COMMIT -f "${__companion}/Dockerfile" "${__companion}";
docker login -u="$DOCKER_USERNAME" -p="$DOCKER_PASSWORD";
docker push transloadit/uppy-companion:$TRAVIS_COMMIT;
docker push transloadit/uppy-companion:latest;

echo $KUBECONFIG | base64 --decode -i > ${HOME}/.kube/config

# Should be already removed. Using it temporarily.
rm -f "${__kube}/companion/uppy-env.yaml"
echo $UPPY_ENV | base64 --decode > "${__kube}/companion/uppy-env.yaml"

kubectl config current-context

kubectl apply -f "${__kube}/companion/uppy-env.yaml"
sleep 10s # This cost me some precious debugging time.
kubectl apply -f "${__kube}/companion/uppy-server-kube.yaml"
kubectl apply -f "${__kube}/companion/uppy-server-redis.yaml"
kubectl set image statefulset uppy-server --namespace=uppy companion=docker.io/transloadit/uppy-companion:$TRAVIS_COMMIT
sleep 10s

kubectl get pods --namespace=uppy
kubectl get service --namespace=uppy
kubectl get deployment --namespace=uppy

function cleanup {
    printf "Cleaning up...\n"
    rm -vf "${__kube}/companion/uppy-env.yaml"
    printf "Cleaning done."
}

trap cleanup EXIT