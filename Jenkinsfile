// ─────────────────────────────────────────────────────────────────────────────
// Jenkins Pipeline — mean_mini Angular Frontend
// Pulls from GitHub → Builds Docker image → Runs container on port 8080
// ─────────────────────────────────────────────────────────────────────────────

pipeline {

    // Run on any available Jenkins agent
    agent any

    environment {
        IMAGE_NAME  = 'mean-mini-frontend'
        CONTAINER_NAME = 'mean-mini-app'
        HOST_PORT   = '8080'
    }

    stages {

        // ── Stage 1: Pull latest code from GitHub ────────────────────────────
        stage('Checkout') {
            steps {
                echo 'Pulling latest code from GitHub...'
                checkout scm
            }
        }

        // ── Stage 2: Stop and remove any old container ───────────────────────
        stage('Cleanup Old Container') {
            steps {
                echo 'Stopping and removing old container (if any)...'
                sh '''
                    docker stop ${CONTAINER_NAME} || true
                    docker rm   ${CONTAINER_NAME} || true
                '''
            }
        }

        // ── Stage 3: Build Docker image ───────────────────────────────────────
        stage('Docker Build') {
            steps {
                echo 'Building Docker image from frontend/Dockerfile...'
                sh 'docker build -t ${IMAGE_NAME} ./frontend'
            }
        }

        // ── Stage 4: Run the container ────────────────────────────────────────
        stage('Docker Run') {
            steps {
                echo 'Starting container on port ${HOST_PORT}...'
                sh '''
                    docker run -d \
                        --name ${CONTAINER_NAME} \
                        -p ${HOST_PORT}:80 \
                        ${IMAGE_NAME}
                '''
            }
        }

        // ── Stage 5: Verify it's running ──────────────────────────────────────
        stage('Verify') {
            steps {
                echo 'Checking running containers...'
                sh 'docker ps --filter name=${CONTAINER_NAME}'
                echo "App should be live at http://localhost:${HOST_PORT}"
            }
        }
    }

    // ── Post-build notifications ──────────────────────────────────────────────
    post {
        success {
            echo "BUILD SUCCESS — Angular app running at http://localhost:${HOST_PORT}"
        }
        failure {
            echo 'BUILD FAILED — check the logs above for errors.'
            // Clean up broken container if build failed mid-way
            sh 'docker rm -f ${CONTAINER_NAME} || true'
        }
    }
}
