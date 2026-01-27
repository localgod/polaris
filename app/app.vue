<template>
    <UApp>
          <NuxtRouteAnnouncer />
    <NuxtPage :key="$route.fullPath" />
    </UApp>


</template>
