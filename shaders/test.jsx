import React, { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import CustomShaderMaterial from 'three-custom-shader-material'
import * as THREE from 'three'
import { useBVH } from '@react-three/drei'

export function SphereBvh({ map, ...props }) {
    const meshRef = useRef();
    const materialRef = useRef();
    const { pointer, camera } = useThree();
    const [animationStartTime, setAnimationStartTime] = useState(null);
    const [isMouseOver, setIsMouseOver] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const initialIntersectionRef = useRef(new THREE.Vector3());

    useBVH(meshRef);

    const uniforms = useMemo(() => ({
        uMouseIntersection: { value: new THREE.Vector3() },
        uInitialIntersection: { value: new THREE.Vector3() },
        uIntersectionRadius: { value: 0.2 },
        uHasIntersection: { value: 0 },
        uAnimationProgress: { value: 0 },
        uDisplacementDirection: { value: new THREE.Vector3() },
        uRingProgress: { value: 0 },
        uRingWidth: { value: 0.05 },
        uRingColor: { value: new THREE.Color(1.0, 0.0, 0.0) },
        uRingOpacity: { value: 0 },
        uDebugMode: { value: props.debugMode || 1 },
    }), [props.debugMode]);

    useEffect(() => {
        const handleMouseMove = () => {
            if (!isInitialized) {
                setIsInitialized(true);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [isInitialized]);

    useFrame((state) => {
        if (!isInitialized) return;

        if (materialRef.current && meshRef.current) {
            const currentTime = state.clock.getElapsedTime();

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(pointer, camera);
            const intersects = raycaster.intersectObject(meshRef.current);

            if (intersects.length > 0) {
                const localIntersection = meshRef.current.worldToLocal(intersects[0].point.clone());
                materialRef.current.uniforms.uMouseIntersection.value.copy(localIntersection);
                materialRef.current.uniforms.uHasIntersection.value = 1;

                if (!isMouseOver) {
                    setIsMouseOver(true);
                    setAnimationStartTime(currentTime);
                    initialIntersectionRef.current.copy(localIntersection);
                    materialRef.current.uniforms.uInitialIntersection.value.copy(localIntersection);

                    const direction = new THREE.Vector3().subVectors(meshRef.current.position, localIntersection).normalize();
                    materialRef.current.uniforms.uDisplacementDirection.value.copy(direction);
                }
            } else {
                materialRef.current.uniforms.uHasIntersection.value = 0;
                if (isMouseOver) {
                    setIsMouseOver(false);
                }
            }

            if (animationStartTime !== null) {
                const animationDuration = 0.8;
                const elapsedTime = currentTime - animationStartTime;
                const progress = Math.min(elapsedTime / animationDuration, 1);
                materialRef.current.uniforms.uAnimationProgress.value = progress;

                const ringDuration = 1.0;
                const ringProgress = Math.min(elapsedTime / ringDuration, 1);
                materialRef.current.uniforms.uRingProgress.value = ringProgress;

                materialRef.current.uniforms.uRingOpacity.value = isMouseOver ? 1 - ringProgress : ringProgress;

                if (progress >= 1) {
                    setAnimationStartTime(null);
                }
            } else {
                materialRef.current.uniforms.uAnimationProgress.value = 0;
                materialRef.current.uniforms.uRingProgress.value = 0;
                materialRef.current.uniforms.uRingOpacity.value = 0;
            }
        }
    });

    const vertexShader = `
    uniform float uAnimationProgress;
    uniform vec3 uDisplacementDirection;
    varying vec3 vPosition;
    varying vec2 vUv;  

    void main() {
    vPosition = position;
    vUv = uv;  

    float displacement = sin(uAnimationProgress * 3.14159) * 0.1;
    vec3 displacedPosition = position + uDisplacementDirection * displacement;

    csm_Position = displacedPosition;
    }
  `;

    const fragmentShader = `
    uniform vec3 uMouseIntersection;
    uniform vec3 uInitialIntersection;
    uniform float uIntersectionRadius;
    uniform float uHasIntersection;
    uniform float uRingProgress;
    uniform float uRingWidth;
    uniform vec3 uRingColor;
    uniform float uRingOpacity;
    uniform float uDebugMode;
    varying vec3 vPosition;

    void main() {    
    // Hardcoded base color
    vec3 baseColor = vec3(0.91, 0.91, 0.91);
    
    vec3 highlightColor = vec3(1.0, 0.0, 0.0);  // Red highlight

    float dist = distance(vPosition, uInitialIntersection);

    // Calculate ring effect
    float ringDist = uRingProgress * 2.0;
    float ringEffect = smoothstep(ringDist - uRingWidth, ringDist, dist) - 
                        smoothstep(ringDist, ringDist + uRingWidth, dist);
    ringEffect *= uRingOpacity; // Apply opacity to the ring

    // Combine colors
    vec3 ringColorMix = mix(baseColor, uRingColor, ringEffect);
    vec3 finalColor = mix(ringColorMix, highlightColor, 0.0);

    csm_DiffuseColor = vec4(finalColor, 1.0);
    }
  `;

    useEffect(() => {
        if (materialRef.current) {
            materialRef.current.uniforms.uDebugMode.value = props.debugMode || 0;
        }
    }, [props.debugMode]);

    return (
        <>
            <mesh
                ref={meshRef}
                castShadow
                receiveShadow
            >
                <sphereGeometry args={[1, 32, 32]} />
                <CustomShaderMaterial
                    ref={materialRef}
                    baseMaterial={THREE.MeshStandardMaterial}
                    vertexShader={vertexShader}
                    fragmentShader={fragmentShader}
                    uniforms={uniforms}
                    silent
                    roughness={0.2}
                    metalness={0.6}
                    color={'red'}
                />
            </mesh>
        </>
    )
}